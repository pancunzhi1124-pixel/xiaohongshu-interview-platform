export const runtime = "nodejs";

import crypto from "node:crypto";
import WebSocket from "ws";
import { int16ToBuffer, parseWavPcm16 } from "@/lib/audio/wav";

const MAX_AUDIO_SIZE_BYTES = 5 * 1024 * 1024;
const QUERY_TIMEOUT_MS = 60000;
const TARGET_SAMPLE_RATE = Number(process.env.ASR_AUDIO_SAMPLE_RATE?.trim() || "8000") || 8000;

type TranscribeProvider = "disabled" | "dashscope_realtime" | "iflytek_raasr";
type TranscribeSuccess = { text: string; provider: "dashscope_realtime" | "iflytek_raasr"; model: string };
type TranscribeFailure = { error: string; detail?: string; provider: TranscribeProvider; model?: string; stage?: string; status?: number };
type ProviderResult = { ok: true; status: number; body: TranscribeSuccess } | { ok: false; status: number; body: TranscribeFailure };
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };
type RaasrUploadResponse = { content?: { orderId?: string }; data?: { orderId?: string }; orderId?: string };

function getFileAsrProvider(): TranscribeProvider {
  const provider = (process.env.FILE_ASR_PROVIDER?.trim() || "dashscope_realtime").toLowerCase();
  if (provider === "iflytek_raasr") return "iflytek_raasr";
  if (provider === "disabled") return "disabled";
  return "dashscope_realtime";
}

function sanitizeDetail(detail: string): string {
  return detail
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(/(Authorization["'\s:=]+)([^,\n\r]+)/gi, "$1[REDACTED]")
    .replace(/(apiKey["'\s:=]+)([^,\n\r]+)/gi, "$1[REDACTED]")
    .replace(/(DASHSCOPE_API_KEY["'\s:=]+)([^,\n\r]+)/gi, "$1[REDACTED]")
    .replace(/(signa=)[^&\s"]+/gi, "$1[REDACTED]")
    .replace(/(secretKey["'\s:=]+)([^,\n\r]+)/gi, "$1[REDACTED]");
}

function extractFinalText(payload: JsonObject): string[] {
  const texts: string[] = [];
  const output = payload.output;
  const push = (v: JsonValue | undefined) => { if (typeof v === "string" && v.trim()) texts.push(v.trim()); };
  if (output && typeof output === "object" && !Array.isArray(output)) {
    const out = output as JsonObject;
    push(out.text);
    if (out.sentence && typeof out.sentence === "object" && !Array.isArray(out.sentence)) push((out.sentence as JsonObject).text);
    if (Array.isArray(out.sentences)) {
      out.sentences.forEach((s) => {
        if (s && typeof s === "object" && !Array.isArray(s)) push((s as JsonObject).text);
      });
    }
    push(out.final_sentence);
    push(out.result);
  }
  push(payload.text);
  if (payload.payload && typeof payload.payload === "object" && !Array.isArray(payload.payload)) {
    const inner = payload.payload as JsonObject;
    if (inner.output && typeof inner.output === "object" && !Array.isArray(inner.output)) {
      const innerOut = inner.output as JsonObject;
      push(innerOut.text);
      if (innerOut.sentence && typeof innerOut.sentence === "object" && !Array.isArray(innerOut.sentence)) push((innerOut.sentence as JsonObject).text);
    }
  }
  return texts;
}

async function transcribeByDashScopeRealtime(audioBuffer: Buffer): Promise<ProviderResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
  const model = process.env.REALTIME_ASR_MODEL?.trim() || "paraformer-realtime-8k-v2";
  if (!apiKey) return { ok: false, status: 400, body: { error: "DashScope API key is not configured", provider: "dashscope_realtime", model, stage: "config" } };

  let pcmBuffer: Buffer;
  try {
    const parsed = parseWavPcm16(audioBuffer);
    pcmBuffer = int16ToBuffer(parsed.pcm);
  } catch (error) {
    return { ok: false, status: 400, body: { error: "Invalid WAV audio", detail: error instanceof Error ? error.message : "WAV parse failed", provider: "dashscope_realtime", model, stage: "parse" } };
  }

  const maxDurationSeconds = 30;
  if (pcmBuffer.length / (TARGET_SAMPLE_RATE * 2) > maxDurationSeconds) {
    return { ok: false, status: 413, body: { error: "Audio file is too long", detail: "请控制单段回答在 30 秒以内，或拆分回答。", provider: "dashscope_realtime", model, stage: "validate" } };
  }

  return new Promise((resolve) => {
    const ws = new WebSocket("wss://dashscope.aliyuncs.com/api-ws/v1/inference", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const finalTexts: string[] = [];
    let settled = false;
    const fail = (detail: string, stage: string) => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, status: 502, body: { error: "DashScope realtime transcription failed", detail: sanitizeDetail(detail), provider: "dashscope_realtime", model, stage } });
      ws.close();
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, status: 504, body: { error: "DashScope realtime transcription timeout", provider: "dashscope_realtime", model, stage: "query" } });
      ws.close();
    }, QUERY_TIMEOUT_MS);

    ws.on("open", () => {
      ws.send(JSON.stringify({ header: { action: "run-task", task_id: `asr-${Date.now()}` }, payload: { task_group: "audio", task: "asr", function: "recognition", model }, parameters: { format: "pcm", sample_rate: TARGET_SAMPLE_RATE, language_hints: ["zh", "en"] } }));
      const frameBytes = TARGET_SAMPLE_RATE * 2 * 0.02;
      for (let offset = 0; offset < pcmBuffer.length; offset += frameBytes) {
        ws.send(pcmBuffer.subarray(offset, Math.min(pcmBuffer.length, offset + frameBytes)), { binary: true });
      }
      ws.send(JSON.stringify({ header: { action: "finish-task", task_id: `asr-${Date.now()}` } }));
    });

    ws.on("message", (data) => {
      const text = typeof data === "string" ? data : data.toString("utf-8");
      try {
        const payload = JSON.parse(text) as JsonObject;
        extractFinalText(payload).forEach((t) => finalTexts.push(t));
        const event = (payload.header && typeof payload.header === "object" ? (payload.header as JsonObject).event : "") as string | undefined;
        if (event === "task-finished") {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          const merged = finalTexts.join(" ").trim();
          if (!merged) {
            resolve({ ok: false, status: 422, body: { error: "DashScope realtime transcription failed", detail: "未识别到语音内容", provider: "dashscope_realtime", model, stage: "query" } });
          } else {
            resolve({ ok: true, status: 200, body: { text: merged, provider: "dashscope_realtime", model } });
          }
          ws.close();
        }
      } catch {
        // ignore non-json
      }
    });

    ws.on("error", (error) => fail(error.message || "websocket error", "connect"));
    ws.on("close", () => {
      if (settled) return;
      clearTimeout(timer);
      const merged = finalTexts.join(" ").trim();
      if (!merged) fail("connection closed before final result", "query");
      else {
        settled = true;
        resolve({ ok: true, status: 200, body: { text: merged, provider: "dashscope_realtime", model } });
      }
    });
  });
}

function createRaasrSigna(appId: string, secretKey: string, ts: string): string { const md5 = crypto.createHash("md5").update(appId + ts).digest("hex"); return crypto.createHmac("sha1", secretKey).update(md5).digest("base64"); }
function normalizeRaasrBaseUrl(input?: string): string { const raw = input?.trim() || "https://raasr.xfyun.cn/v2/api"; return raw.replace(/\/+$|\/(upload|getResult)$/gi, ""); }
function toStrictArrayBuffer(input: Uint8Array): ArrayBuffer { const out = new ArrayBuffer(input.byteLength); new Uint8Array(out).set(input); return out; }
function tryParseJson(text: string): JsonObject | null { try { const p = JSON.parse(text) as unknown; return p && typeof p === "object" && !Array.isArray(p) ? p as JsonObject : null; } catch { return null; } }

async function transcribeByIflytekRaasr(audioBuffer: Buffer, fileName: string): Promise<ProviderResult> {
  const appId = process.env.IFLYTEK_RAASR_APP_ID?.trim(); const secretKey = process.env.IFLYTEK_RAASR_SECRET_KEY?.trim();
  if (!appId || !secretKey) return { ok: false, status: 400, body: { error: "Iflytek RAASR credentials are not configured", detail: "请配置 IFLYTEK_RAASR_APP_ID 和 IFLYTEK_RAASR_SECRET_KEY。", provider: "iflytek_raasr", stage: "config" } };
  const baseUrl = normalizeRaasrBaseUrl(process.env.IFLYTEK_RAASR_API_URL);
  const ts = Math.floor(Date.now() / 1000).toString();
  const signa = createRaasrSigna(appId, secretKey, ts);
  const uploadParams = new URLSearchParams({ appId, ts, signa, fileName: fileName || `interview-${Date.now()}.wav`, fileSize: String(audioBuffer.byteLength), duration: String(Math.max(1, Math.round(audioBuffer.byteLength / 32000))) });
  const uploadRes = await fetch(`${baseUrl}/upload?${uploadParams.toString()}`, { method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8", Chunked: "false" }, body: toStrictArrayBuffer(audioBuffer) });
  const uploadText = await uploadRes.text();
  if (!uploadRes.ok) return { ok: false, status: 502, body: { error: "Iflytek RAASR upload failed", detail: sanitizeDetail(uploadText), provider: "iflytek_raasr", stage: "upload", status: uploadRes.status } };
  const payload = tryParseJson(uploadText) as RaasrUploadResponse | null;
  const orderId = payload?.content?.orderId ?? payload?.data?.orderId ?? payload?.orderId ?? "";
  if (!orderId) return { ok: false, status: 502, body: { error: "Iflytek RAASR upload succeeded but no orderId returned", detail: sanitizeDetail(uploadText), provider: "iflytek_raasr", stage: "upload" } };
  return { ok: false, status: 202, body: { error: "Iflytek RAASR result not ready", detail: `文件已上传，orderId=${orderId}，请稍后重试。`, provider: "iflytek_raasr", stage: "query" } };
}

export async function POST(request: Request) {
  const provider = getFileAsrProvider();
  if (provider === "disabled") return Response.json({ error: "File transcription is disabled", detail: "当前未启用录音转写，请联系管理员设置 FILE_ASR_PROVIDER。", provider: "disabled", stage: "config" }, { status: 400 });
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) return Response.json({ error: "Missing audio file" }, { status: 400 });
    if (audio.size > MAX_AUDIO_SIZE_BYTES) return Response.json({ error: "Audio file is too large", detail: "请控制单段回答在 30 秒以内，或拆分回答。" }, { status: 413 });
    const audioBuffer = Buffer.from(await audio.arrayBuffer());

    const result = provider === "dashscope_realtime"
      ? await transcribeByDashScopeRealtime(audioBuffer)
      : await transcribeByIflytekRaasr(audioBuffer, audio.name);
    return Response.json(result.body, { status: result.status });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: "Transcription failed", detail: sanitizeDetail(detail), provider, stage: "runtime" }, { status: 502 });
  }
}
