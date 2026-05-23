export const runtime = "nodejs";

import crypto from "node:crypto";

const MAX_AUDIO_SIZE_BYTES = 4 * 1024 * 1024;
const POLL_MAX_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_TOTAL_MS = 30000;

type TranscribeProvider = "iflytek_raasr" | "tencent";

type RaasrUploadResponse = {
  code?: string;
  descInfo?: string;
  content?: {
    orderId?: string;
  };
  data?: {
    orderId?: string;
  };
  orderId?: string;
};

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

function getProvider(): TranscribeProvider {
  const provider =
    process.env.ASR_PROVIDER?.trim() ||
    process.env.TRANSCRIBE_PROVIDER?.trim() ||
    "iflytek_raasr";
  return provider === "tencent" ? "tencent" : "iflytek_raasr";
}

function requireIflytekEnv(name: "IFLYTEK_RAASR_APP_ID" | "IFLYTEK_RAASR_SECRET_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function isValidWavHeader(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const header = buffer.subarray(0, 12).toString("ascii");
  return header.includes("RIFF") && header.includes("WAVE");
}

function createRaasrSigna(appId: string, secretKey: string, ts: string): string {
  const baseString = appId + ts;
  const md5 = crypto.createHash("md5").update(baseString).digest("hex");
  return crypto.createHmac("sha1", secretKey).update(md5).digest("base64");
}

function normalizeRaasrBaseUrl(input?: string): string {
  const raw = input?.trim() || "https://raasr.xfyun.cn/v2/api";
  return raw
    .replace(/\/+$/, "")
    .replace(/\/upload$/, "")
    .replace(/\/xxx$/, "");
}

function toStrictArrayBuffer(input: Uint8Array): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(input.byteLength);
  new Uint8Array(arrayBuffer).set(input);
  return arrayBuffer;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeDetail(detail: string): string {
  return detail
    .replace(/([?&]signa=)[^&\s"]+/gi, "$1[REDACTED]")
    .replace(/("signa"\s*:\s*")[^"]+("?)/gi, "$1[REDACTED]$2")
    .replace(/("secretKey"\s*:\s*")[^"]+("?)/gi, "$1[REDACTED]$2")
    .replace(/("apiKey"\s*:\s*")[^"]+("?)/gi, "$1[REDACTED]$2");
}

function extractOrderId(payload: RaasrUploadResponse): string {
  return payload.content?.orderId ?? payload.data?.orderId ?? payload.orderId ?? "";
}

function tryParseJson(text: string): JsonObject | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
    return null;
  } catch {
    return null;
  }
}

function flattenText(value: JsonValue): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "";
  if (Array.isArray(value)) {
    return value.map(flattenText).filter((item) => item.trim()).join(" ");
  }
  return Object.values(value).map(flattenText).filter((item) => item.trim()).join(" ");
}

function extractTranscriptFromResult(payload: JsonObject): string {
  const directCandidates: JsonValue[] = [
    payload.text,
    payload.result,
    payload.data && typeof payload.data === "object" ? (payload.data as JsonObject).text : null,
    payload.data && typeof payload.data === "object" ? (payload.data as JsonObject).result : null,
    payload.content && typeof payload.content === "object" ? (payload.content as JsonObject).text : null,
    payload.content && typeof payload.content === "object" ? (payload.content as JsonObject).result : null,
  ];

  for (const candidate of directCandidates) {
    if (candidate === undefined) continue;
    const text = flattenText(candidate).trim();
    if (text) return text;
  }

  const content = payload.content;
  if (content && typeof content === "object") {
    const orderResult = (content as JsonObject).orderResult;
    if (typeof orderResult === "string" && orderResult.trim()) {
      const inner = tryParseJson(orderResult);
      if (inner) {
        const text = flattenText(inner).trim();
        if (text) return text;
      }
      return orderResult.trim();
    }
  }

  return "";
}

function isRaasrCompleted(payload: JsonObject): boolean {
  const content = payload.content;
  if (!content || typeof content !== "object") return false;
  const orderInfo = (content as JsonObject).orderInfo;
  if (!orderInfo || typeof orderInfo !== "object") return false;
  const status = (orderInfo as JsonObject).status;
  return status === 4 || status === "4";
}

async function transcribeByIflytekRaasr(audioBuffer: Buffer, fileName: string) {
  const appId = requireIflytekEnv("IFLYTEK_RAASR_APP_ID");
  const secretKey = requireIflytekEnv("IFLYTEK_RAASR_SECRET_KEY");
  const baseUrl = normalizeRaasrBaseUrl(process.env.IFLYTEK_RAASR_API_URL);
  const uploadUrl = `${baseUrl}/upload`;
  const resultUrl = `${baseUrl}/getResult`;

  const ts = Math.floor(Date.now() / 1000).toString();
  const signa = createRaasrSigna(appId, secretKey, ts);
  const safeFileName = fileName?.trim() || `interview-${Date.now()}.wav`;
  const duration = Math.max(1, Math.round(audioBuffer.byteLength / 32000));

  const uploadParams = new URLSearchParams({
    appId,
    ts,
    signa,
    fileName: safeFileName,
    fileSize: String(audioBuffer.byteLength),
    duration: String(duration),
  });

  const response = await fetch(`${uploadUrl}?${uploadParams.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      Chunked: "false",
    },
    body: toStrictArrayBuffer(audioBuffer),
  });

  const responseText = await response.text();
  console.log("RAASR upload status:", response.status);
  console.log("RAASR upload response:", sanitizeDetail(responseText));

  if (!response.ok) {
    return {
      ok: false as const,
      status: 502,
      body: {
        error: "Iflytek RAASR upload failed",
        detail: sanitizeDetail(responseText),
        provider: "iflytek_raasr",
        status: response.status,
        url: uploadUrl,
      },
    };
  }

  const payload = JSON.parse(responseText) as RaasrUploadResponse;
  const orderId = extractOrderId(payload);

  if (!orderId) {
    return {
      ok: false as const,
      status: 502,
      body: {
        error: "Iflytek RAASR upload succeeded but no orderId returned",
        detail: sanitizeDetail(responseText),
        provider: "iflytek_raasr",
        stage: "upload",
      },
    };
  }

  const startedAt = Date.now();
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
    if (Date.now() - startedAt >= POLL_MAX_TOTAL_MS) break;

    const pollTs = Math.floor(Date.now() / 1000).toString();
    const pollSigna = createRaasrSigna(appId, secretKey, pollTs);
    const query = new URLSearchParams({ appId, ts: pollTs, signa: pollSigna, orderId });
    const resultResponse = await fetch(`${resultUrl}?${query.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data;",
      },
    });

    const resultText = await resultResponse.text();
    const safeResultText = sanitizeDetail(resultText);
    if (!resultResponse.ok) {
      return {
        ok: false as const,
        status: 502,
        body: {
          error: "Iflytek RAASR result query failed",
          detail: safeResultText,
          provider: "iflytek_raasr",
          stage: "query",
          status: resultResponse.status,
          url: resultUrl,
          orderId,
        },
      };
    }

    const resultPayload = tryParseJson(resultText);
    if (!resultPayload) {
      return {
        ok: false as const,
        status: 502,
        body: {
          error: "Iflytek RAASR result parse failed",
          detail: safeResultText,
          provider: "iflytek_raasr",
          stage: "query",
          orderId,
        },
      };
    }

    if (isRaasrCompleted(resultPayload)) {
      const transcript = extractTranscriptFromResult(resultPayload).trim();
      if (transcript) {
        return {
          ok: true as const,
          status: 200,
          body: {
            text: transcript,
            provider: "iflytek_raasr",
            orderId,
          },
        };
      }
    }

    if (attempt < POLL_MAX_ATTEMPTS - 1) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  return {
    ok: false as const,
    status: 202,
    body: {
      error: "Iflytek RAASR result not ready",
      detail: "文件已上传成功，但转写结果尚未完成，请稍后重试。",
      provider: "iflytek_raasr",
      orderId,
    },
  };
}

export async function POST(request: Request) {
  const provider = getProvider();

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) {
      return Response.json({ error: "Missing audio file" }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_SIZE_BYTES) {
      return Response.json({ error: "Audio file is too large", detail: "请缩短录音时间，建议每段控制在 15 秒以内。" }, { status: 413 });
    }

    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    if (!isValidWavHeader(audioBuffer)) {
      return Response.json({ error: "Invalid WAV audio", detail: "上传的音频不是标准 WAV。请检查前端 recorder-core 配置。" }, { status: 400 });
    }

    if (provider !== "iflytek_raasr") {
      return Response.json({ error: `Unsupported provider: ${provider}`, provider }, { status: 400 });
    }

    const result = await transcribeByIflytekRaasr(audioBuffer, audio.name);
    return Response.json(result.body, { status: result.status });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: "Iflytek RAASR transcription failed", detail: sanitizeDetail(detail), provider: "iflytek_raasr" }, { status: 502 });
  }
}
