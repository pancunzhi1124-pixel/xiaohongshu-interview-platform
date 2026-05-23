export const runtime = "nodejs";

import crypto from "node:crypto";

const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024;
const POLL_MAX_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_TOTAL_MS = 60000;

type TranscribeProvider = "disabled" | "iflytek_raasr";
type TranscribeSuccess = { text: string; provider: "iflytek_raasr"; model: string };
type TranscribeFailure = { error: string; detail?: string; provider: TranscribeProvider; model?: string; stage?: string; status?: number };
type ProviderResult = { ok: true; status: number; body: TranscribeSuccess } | { ok: false; status: number; body: TranscribeFailure };
type RaasrUploadResponse = { content?: { orderId?: string }; data?: { orderId?: string }; orderId?: string };
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

function getFileAsrProvider(): TranscribeProvider {
  const fileProvider = (process.env.FILE_ASR_PROVIDER?.trim() || "disabled").toLowerCase();
  return fileProvider === "iflytek_raasr" ? "iflytek_raasr" : "disabled";
}

function isValidWavHeader(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const header = buffer.subarray(0, 12).toString("ascii");
  return header.includes("RIFF") && header.includes("WAVE");
}

function createRaasrSigna(appId: string, secretKey: string, ts: string): string {
  const md5 = crypto.createHash("md5").update(appId + ts).digest("hex");
  return crypto.createHmac("sha1", secretKey).update(md5).digest("base64");
}

function normalizeRaasrBaseUrl(input?: string): string {
  const raw = input?.trim() || "https://raasr.xfyun.cn/v2/api";
  return raw.replace(/^\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/i, "").trim().replace(/\/+$/, "").replace(/\/(upload|getResult)$/i, "");
}

function toStrictArrayBuffer(input: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(input.byteLength);
  new Uint8Array(out).set(input);
  return out;
}

function sleep(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
function sanitizeDetail(detail: string): string {
  return detail.replace(/([?&]signa=)[^&\s"]+/gi, "$1[REDACTED]").replace(/([?&]token=)[^&\s"]+/gi, "$1[REDACTED]").replace(/("secretKey"\s*:\s*")[^"]+("?)/gi, "$1[REDACTED]$2").replace(/("Authorization"\s*:\s*")([^"]+)("?)/gi, "$1[REDACTED]$3");
}
function tryParseJson(text: string): JsonObject | null { try { const p = JSON.parse(text) as unknown; return p && typeof p === "object" && !Array.isArray(p) ? p as JsonObject : null; } catch { return null; } }
function flattenText(value: JsonValue): string { if (typeof value === "string") return value; if (typeof value === "number" || typeof value === "boolean") return String(value); if (value === null) return ""; if (Array.isArray(value)) return value.map(flattenText).filter((v)=>v.trim()).join(" "); return Object.values(value).map(flattenText).filter((v)=>v.trim()).join(" "); }
function extractOrderId(payload: RaasrUploadResponse): string { return payload.content?.orderId ?? payload.data?.orderId ?? payload.orderId ?? ""; }
function extractTranscriptFromResult(payload: JsonObject): string { const content = payload.content; if (content && typeof content === "object") { const orderResult=(content as JsonObject).orderResult; if (typeof orderResult === "string" && orderResult.trim()) { const inner=tryParseJson(orderResult); return inner ? flattenText(inner).trim() : orderResult.trim(); } } return flattenText(payload.result ?? payload.text ?? "").trim(); }
function isRaasrCompleted(payload: JsonObject): boolean { const status = (((payload.content as JsonObject)?.orderInfo as JsonObject)?.status); return status === 4 || status === "4"; }

async function transcribeByIflytekRaasr(audioBuffer: Buffer, fileName: string): Promise<ProviderResult> {
  const appId = process.env.IFLYTEK_RAASR_APP_ID?.trim();
  const secretKey = process.env.IFLYTEK_RAASR_SECRET_KEY?.trim();
  if (!appId || !secretKey) return { ok:false,status:400,body:{ error:"Iflytek RAASR credentials are not configured", detail:"请配置 IFLYTEK_RAASR_APP_ID 和 IFLYTEK_RAASR_SECRET_KEY。", provider:"iflytek_raasr", stage:"config" } };
  const baseUrl = normalizeRaasrBaseUrl(process.env.IFLYTEK_RAASR_API_URL);
  const ts = Math.floor(Date.now() / 1000).toString();
  const signa = createRaasrSigna(appId, secretKey, ts);
  const uploadUrl = `${baseUrl}/upload`;
  const safeFileName = fileName?.trim() || `interview-${Date.now()}.wav`;
  const duration = Math.max(1, Math.round(audioBuffer.byteLength / 32000));
  const uploadParams = new URLSearchParams({ appId, ts, signa, fileName: safeFileName, fileSize: String(audioBuffer.byteLength), duration: String(duration) });
  const uploadRes = await fetch(`${uploadUrl}?${uploadParams.toString()}`, { method:"POST", headers:{"Content-Type":"application/json; charset=UTF-8", Chunked:"false"}, body:toStrictArrayBuffer(audioBuffer) });
  const uploadText = await uploadRes.text();
  if (!uploadRes.ok) return { ok:false,status:502,body:{error:"Iflytek RAASR upload failed",detail:sanitizeDetail(uploadText),provider:"iflytek_raasr",stage:"upload",status:uploadRes.status} };
  const payload = tryParseJson(uploadText) as RaasrUploadResponse | null;
  const orderId = payload ? extractOrderId(payload) : "";
  if (!orderId) return { ok:false,status:502,body:{error:"Iflytek RAASR upload succeeded but no orderId returned",detail:sanitizeDetail(uploadText),provider:"iflytek_raasr",stage:"upload"} };
  const startedAt = Date.now();
  for (let attempt=0; attempt<POLL_MAX_ATTEMPTS; attempt+=1) {
    if (Date.now()-startedAt>=POLL_MAX_TOTAL_MS) break;
    const pollTs = Math.floor(Date.now()/1000).toString();
    const pollSigna = createRaasrSigna(appId, secretKey, pollTs);
    const resultQuery = new URLSearchParams({ appId, ts: pollTs, signa: pollSigna, orderId });
    const resultRes = await fetch(`${baseUrl}/getResult?${resultQuery.toString()}`, { method:"POST", headers:{"Content-Type":"multipart/form-data;"} });
    const resultText = await resultRes.text();
    if (!resultRes.ok) return { ok:false,status:502,body:{error:"Iflytek RAASR result query failed",detail:sanitizeDetail(resultText),provider:"iflytek_raasr",stage:"query",status:resultRes.status} };
    const resultPayload = tryParseJson(resultText);
    if (resultPayload && isRaasrCompleted(resultPayload)) {
      const transcript = extractTranscriptFromResult(resultPayload);
      if (transcript) return { ok:true,status:200,body:{ text: transcript, provider:"iflytek_raasr", model:"raasr" } };
    }
    if (attempt < POLL_MAX_ATTEMPTS - 1) await sleep(POLL_INTERVAL_MS);
  }
  return { ok:false,status:202,body:{ error:"Iflytek RAASR result not ready",detail:"文件已上传成功，但转写结果尚未完成，请稍后重试。",provider:"iflytek_raasr",stage:"query" } };
}

export async function POST(request: Request) {
  const fileProvider = getFileAsrProvider();
  const asrProvider = (process.env.ASR_PROVIDER?.trim() || "browser_realtime").toLowerCase();
  if (fileProvider === "disabled" || asrProvider === "browser_realtime" || asrProvider === "dashscope_realtime") {
    return Response.json({ error:"File transcription is disabled", detail:"当前默认使用实时字幕模式。请使用“开始实时回答”，或在环境变量中启用 FILE_ASR_PROVIDER。", provider:"disabled", stage:"config" }, { status: 400 });
  }
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) return Response.json({ error: "Missing audio file" }, { status: 400 });
    if (audio.size > MAX_AUDIO_SIZE_BYTES) return Response.json({ error:"Audio file is too large", detail:"请缩短录音时间后重试，建议将单段录音控制在 1 分钟以内。" }, { status:413 });
    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    if (!isValidWavHeader(audioBuffer)) return Response.json({ error:"Invalid WAV audio", detail:"上传的音频不是标准 WAV。请检查前端 recorder-core 配置。" }, { status:400 });

    const result = await transcribeByIflytekRaasr(audioBuffer, audio.name);
    return Response.json(result.body, { status: result.status });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error:"Transcription failed", detail:sanitizeDetail(detail), provider:fileProvider, stage:"runtime" }, { status: 502 });
  }
}
