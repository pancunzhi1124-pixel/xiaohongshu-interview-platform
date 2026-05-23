export const runtime = "nodejs";

import crypto from "node:crypto";

const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024;
const POLL_MAX_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_TOTAL_MS = 30000;

const DEFAULT_DASHSCOPE_URL = "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription";
const DEFAULT_DASHSCOPE_MODEL = "paraformer-v2";

type TranscribeProvider = "dashscope" | "iflytek_raasr";

type TranscribeSuccess = {
  text: string;
  provider: TranscribeProvider;
  model: string;
};

type TranscribeFailure = {
  error: string;
  detail?: string;
  provider: TranscribeProvider;
  model?: string;
  stage?: string;
  status?: number;
};

type ProviderResult =
  | { ok: true; status: number; body: TranscribeSuccess }
  | { ok: false; status: number; body: TranscribeFailure };

type RaasrUploadResponse = {
  content?: { orderId?: string };
  data?: { orderId?: string };
  orderId?: string;
};

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

function getProvider(): TranscribeProvider {
  const provider = (process.env.ASR_PROVIDER?.trim() || "dashscope").toLowerCase();
  return provider === "iflytek_raasr" ? "iflytek_raasr" : "dashscope";
}

function getAsrModel(): string {
  const value = process.env.ASR_MODEL?.trim();
  return value || DEFAULT_DASHSCOPE_MODEL;
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
  const withoutMethod = raw.replace(/^\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/i, "").trim();
  return withoutMethod
    .replace(/\/+$/, "")
    .replace(/\/(upload|getResult)$/i, "");
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
    .replace(/([?&]token=)[^&\s"]+/gi, "$1[REDACTED]")
    .replace(/([?&]api[-_]?key=)[^&\s"]+/gi, "$1[REDACTED]")
    .replace(/("signa"\s*:\s*")[^"]+("?)/gi, "$1[REDACTED]$2")
    .replace(/("secretKey"\s*:\s*")[^"]+("?)/gi, "$1[REDACTED]$2")
    .replace(/("apiKey"\s*:\s*")[^"]+("?)/gi, "$1[REDACTED]$2")
    .replace(/("Authorization"\s*:\s*")([^"]+)("?)/gi, "$1[REDACTED]$3");
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
  if (Array.isArray(value)) return value.map(flattenText).filter((v) => v.trim()).join(" ");
  return Object.values(value).map(flattenText).filter((v) => v.trim()).join(" ");
}

function extractDashscopeText(payload: JsonObject): string {
  const output = payload.output;
  if (output && typeof output === "object") {
    const direct = (output as JsonObject).text;
    if (typeof direct === "string" && direct.trim()) return direct.trim();

    const sentence = (output as JsonObject).sentence;
    if (Array.isArray(sentence)) {
      const joined = sentence
        .map((item) => {
          if (item && typeof item === "object") {
            const text = (item as JsonObject).text;
            return typeof text === "string" ? text : "";
          }
          return "";
        })
        .filter((item) => item.trim())
        .join(" ")
        .trim();
      if (joined) return joined;
    }

    const sentences = (output as JsonObject).sentences;
    if (Array.isArray(sentences)) {
      const joined = sentences
        .map((item) => {
          if (item && typeof item === "object") {
            const text = (item as JsonObject).text;
            return typeof text === "string" ? text : "";
          }
          return "";
        })
        .filter((item) => item.trim())
        .join(" ")
        .trim();
      if (joined) return joined;
    }

    const result = (output as JsonObject).result;
    if (typeof result === "string" && result.trim()) return result.trim();
  }

  const text = payload.text;
  if (typeof text === "string" && text.trim()) return text.trim();
  return "";
}

function extractTranscriptFromResult(payload: JsonObject): string {
  const candidates: JsonValue[] = [payload.text, payload.result];
  for (const candidate of candidates) {
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

async function transcribeByDashscope(audioBuffer: Buffer, model: string): Promise<ProviderResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "Missing DASHSCOPE_API_KEY",
        detail: "请在环境变量中配置 DASHSCOPE_API_KEY 后重试。",
        provider: "dashscope",
        model,
        stage: "config",
      },
    };
  }

  const endpoint = process.env.DASHSCOPE_ASR_URL?.trim() || DEFAULT_DASHSCOPE_URL;
  const formData = new FormData();
  formData.append("model", model);
  formData.append("file", new Blob([toStrictArrayBuffer(audioBuffer)], { type: "audio/wav" }), "interview.wav");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });
    const text = await response.text();
    const payload = tryParseJson(text);

    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        body: {
          error: "DashScope transcription request failed",
          detail: sanitizeDetail(text),
          provider: "dashscope",
          model,
          stage: "request",
          status: response.status,
        },
      };
    }

    if (!payload) {
      return {
        ok: false,
        status: 502,
        body: {
          error: "DashScope response parse failed",
          detail: "响应不是有效 JSON，请检查 DashScope ASR 接口配置。",
          provider: "dashscope",
          model,
          stage: "parse",
        },
      };
    }

    const transcript = extractDashscopeText(payload);
    if (!transcript) {
      return {
        ok: false,
        status: 502,
        body: {
          error: "DashScope transcript is empty",
          detail:
            "当前接口未返回可用文本。若你使用的是仅支持公网音频 URL 的接口，请先将音频上传到 OSS 并传入可访问 URL。",
          provider: "dashscope",
          model,
          stage: "extract",
        },
      };
    }

    return {
      ok: true,
      status: 200,
      body: { text: transcript, provider: "dashscope", model },
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return {
      ok: false,
      status: 502,
      body: {
        error: "DashScope transcription failed",
        detail: sanitizeDetail(detail),
        provider: "dashscope",
        model,
        stage: "request",
      },
    };
  }
}

async function transcribeByIflytekRaasr(audioBuffer: Buffer, fileName: string): Promise<ProviderResult> {
  const appId = process.env.IFLYTEK_RAASR_APP_ID?.trim();
  const secretKey = process.env.IFLYTEK_RAASR_SECRET_KEY?.trim();
  if (!appId || !secretKey) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "Iflytek RAASR credentials are not configured",
        detail: "请配置 IFLYTEK_RAASR_APP_ID 和 IFLYTEK_RAASR_SECRET_KEY。",
        provider: "iflytek_raasr",
        stage: "config",
      },
    };
  }

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
  if (!response.ok) {
    return {
      ok: false,
      status: 502,
      body: {
        error: "Iflytek RAASR upload failed",
        detail: sanitizeDetail(responseText),
        provider: "iflytek_raasr",
        stage: "upload",
        status: response.status,
      },
    };
  }

  const payload = tryParseJson(responseText) as RaasrUploadResponse | null;
  if (!payload) {
    return {
      ok: false,
      status: 502,
      body: {
        error: "Iflytek RAASR upload response parse failed",
        detail: sanitizeDetail(responseText),
        provider: "iflytek_raasr",
        stage: "upload",
      },
    };
  }

  const orderId = extractOrderId(payload);
  if (!orderId) {
    return {
      ok: false,
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
      headers: { "Content-Type": "multipart/form-data;" },
    });

    const resultText = await resultResponse.text();
    const safeResultText = sanitizeDetail(resultText);
    if (!resultResponse.ok) {
      return {
        ok: false,
        status: 502,
        body: {
          error: "Iflytek RAASR result query failed",
          detail: safeResultText,
          provider: "iflytek_raasr",
          stage: "query",
          status: resultResponse.status,
        },
      };
    }

    const resultPayload = tryParseJson(resultText);
    if (!resultPayload) {
      return {
        ok: false,
        status: 502,
        body: {
          error: "Iflytek RAASR result parse failed",
          detail: safeResultText,
          provider: "iflytek_raasr",
          stage: "query",
        },
      };
    }

    if (isRaasrCompleted(resultPayload)) {
      const transcript = extractTranscriptFromResult(resultPayload).trim();
      if (transcript) {
        return {
          ok: true,
          status: 200,
          body: { text: transcript, provider: "iflytek_raasr", model: "raasr" },
        };
      }
    }

    if (attempt < POLL_MAX_ATTEMPTS - 1) await sleep(POLL_INTERVAL_MS);
  }

  return {
    ok: false,
    status: 202,
    body: {
      error: "Iflytek RAASR result not ready",
      detail: "文件已上传成功，但转写结果尚未完成，请稍后重试。",
      provider: "iflytek_raasr",
      stage: "query",
    },
  };
}

export async function POST(request: Request) {
  const provider = getProvider();
  const model = getAsrModel();

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) {
      return Response.json({ error: "Missing audio file" }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_SIZE_BYTES) {
      return Response.json(
        { error: "Audio file is too large", detail: "请缩短录音时间后重试，建议将单段录音控制在 1 分钟以内。" },
        { status: 413 },
      );
    }

    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    if (!isValidWavHeader(audioBuffer)) {
      return Response.json({ error: "Invalid WAV audio", detail: "上传的音频不是标准 WAV。请检查前端 recorder-core 配置。" }, { status: 400 });
    }

    const result =
      provider === "iflytek_raasr"
        ? await transcribeByIflytekRaasr(audioBuffer, audio.name)
        : await transcribeByDashscope(audioBuffer, model);

    return Response.json(result.body, { status: result.status });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      {
        error: "Transcription failed",
        detail: sanitizeDetail(detail),
        provider,
        model: provider === "dashscope" ? model : "raasr",
        stage: "runtime",
      },
      { status: 502 },
    );
  }
}
