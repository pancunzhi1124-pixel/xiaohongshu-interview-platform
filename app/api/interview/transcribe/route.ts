export const runtime = "nodejs";

import crypto from "node:crypto";

const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024;
const POLL_MAX_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_TOTAL_MS = 60000;
const OSS_SIGNED_URL_EXPIRES_SECONDS = 600;

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

type DashscopeCreateTaskResponse = {
  code?: string;
  message?: string;
  output?: {
    task_id?: string;
    task_status?: string;
    text?: string;
    sentences?: Array<{ text?: string }>;
    results?: Array<{ text?: string; transcription_url?: string }>;
  };
};

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type OssConfig = {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint: string;
  secure: boolean;
};

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
    .replace(/([?&]Signature=)[^&\s"]+/gi, "$1[REDACTED]")
    .replace(/([?&]OSSAccessKeyId=)[^&\s"]+/gi, "$1[REDACTED]")
    .replace(/("signa"\s*:\s*")[^"]+("?)/gi, "$1[REDACTED]$2")
    .replace(/("secretKey"\s*:\s*")[^"]+("?)/gi, "$1[REDACTED]$2")
    .replace(/("apiKey"\s*:\s*")[^"]+("?)/gi, "$1[REDACTED]$2")
    .replace(/("accessKeyId"\s*:\s*")[^"]+("?)/gi, "$1[REDACTED]$2")
    .replace(/("accessKeySecret"\s*:\s*")[^"]+("?)/gi, "$1[REDACTED]$2")
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

function extractTextFromSentences(items: JsonValue | undefined): string {
  if (!Array.isArray(items)) return "";
  const text = items
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return "";
      const content = (item as JsonObject).text;
      return typeof content === "string" ? content : "";
    })
    .filter((item) => item.trim())
    .join(" ")
    .trim();
  return text;
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

function boolFromEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return defaultValue;
}

function getOssConfig(): OssConfig | null {
  const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID?.trim();
  const accessKeySecret = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET?.trim();
  const bucket = process.env.ALIYUN_OSS_BUCKET?.trim();
  const endpointFromEnv = process.env.ALIYUN_OSS_ENDPOINT?.trim();
  const region = process.env.ALIYUN_OSS_REGION?.trim();

  if (!accessKeyId || !accessKeySecret || !bucket || (!endpointFromEnv && !region)) {
    return null;
  }

  const endpoint = endpointFromEnv || `${region}.aliyuncs.com`;
  const secure = boolFromEnv(process.env.ALIYUN_OSS_SECURE, true);
  return { accessKeyId, accessKeySecret, bucket, endpoint, secure };
}

function buildOssObjectKey(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const date = `${yyyy}-${mm}-${dd}`;
  const random = crypto.randomBytes(6).toString("hex");
  return `interview-asr/${date}/${Date.now()}-${random}.wav`;
}

function signOssV1(secret: string, stringToSign: string): string {
  return crypto.createHmac("sha1", secret).update(stringToSign).digest("base64");
}

function buildOssSignedGetUrl(config: OssConfig, objectKey: string, expiresInSeconds: number): string {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const canonical = `GET\n\n\n${expires}\n/${config.bucket}/${objectKey}`;
  const signature = signOssV1(config.accessKeySecret, canonical);
  const protocol = config.secure ? "https" : "http";
  const url = new URL(`${protocol}://${config.bucket}.${config.endpoint}/${encodeURI(objectKey)}`);
  url.searchParams.set("OSSAccessKeyId", config.accessKeyId);
  url.searchParams.set("Expires", String(expires));
  url.searchParams.set("Signature", signature);
  return url.toString();
}

async function uploadAudioToOss(config: OssConfig, objectKey: string, audioBuffer: Buffer): Promise<{ ok: true } | { ok: false; detail: string; status?: number }> {
  const protocol = config.secure ? "https" : "http";
  const date = new Date().toUTCString();
  const contentType = "audio/wav";
  const stringToSign = `PUT\n\n${contentType}\n${date}\n/${config.bucket}/${objectKey}`;
  const signature = signOssV1(config.accessKeySecret, stringToSign);
  const authorization = `OSS ${config.accessKeyId}:${signature}`;
  const url = `${protocol}://${config.bucket}.${config.endpoint}/${encodeURI(objectKey)}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Date: date,
      "Content-Type": contentType,
      Authorization: authorization,
    },
    body: toStrictArrayBuffer(audioBuffer),
  });

  if (response.ok) return { ok: true };
  const text = sanitizeDetail(await response.text());
  return { ok: false, detail: text || "OSS upload failed", status: response.status };
}

async function deleteOssObject(config: OssConfig, objectKey: string): Promise<void> {
  const protocol = config.secure ? "https" : "http";
  const date = new Date().toUTCString();
  const stringToSign = `DELETE\n\n\n${date}\n/${config.bucket}/${objectKey}`;
  const signature = signOssV1(config.accessKeySecret, stringToSign);
  const authorization = `OSS ${config.accessKeyId}:${signature}`;
  const url = `${protocol}://${config.bucket}.${config.endpoint}/${encodeURI(objectKey)}`;

  try {
    await fetch(url, {
      method: "DELETE",
      headers: { Date: date, Authorization: authorization },
    });
  } catch {
    // noop
  }
}

async function extractDashscopeTaskText(payload: JsonObject): Promise<string> {
  const output = payload.output;
  if (!output || typeof output !== "object" || Array.isArray(output)) return "";
  const outputObj = output as JsonObject;

  const direct = outputObj.text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const sentenceText = extractTextFromSentences(outputObj.sentences);
  if (sentenceText) return sentenceText;

  const resultText = extractTextFromSentences(outputObj.results);
  if (resultText) return resultText;

  if (Array.isArray(outputObj.results)) {
    for (const item of outputObj.results) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const transcriptionUrl = (item as JsonObject).transcription_url;
      if (typeof transcriptionUrl !== "string" || !transcriptionUrl.trim()) continue;
      const response = await fetch(transcriptionUrl);
      const text = await response.text();
      const parsed = tryParseJson(text);
      if (!parsed) continue;

      const directText = parsed.text;
      if (typeof directText === "string" && directText.trim()) return directText.trim();
      const sentencesText = extractTextFromSentences(parsed.sentences);
      if (sentencesText) return sentencesText;
      if (Array.isArray(parsed.transcripts)) {
        const transcriptText = parsed.transcripts
          .map((value) => (typeof value === "string" ? value : ""))
          .filter((value) => value.trim())
          .join(" ")
          .trim();
        if (transcriptText) return transcriptText;
      }
    }
  }

  return "";
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

  const ossConfig = getOssConfig();
  if (!ossConfig) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "DashScope paraformer-v2 requires file_urls",
        detail:
          "DashScope 文件转写接口需要公网可访问的 file_urls。请在 Netlify 配置 OSS 临时文件环境变量：ALIYUN_OSS_ACCESS_KEY_ID、ALIYUN_OSS_ACCESS_KEY_SECRET、ALIYUN_OSS_BUCKET、ALIYUN_OSS_REGION（或 ALIYUN_OSS_ENDPOINT）、ALIYUN_OSS_SECURE。",
        provider: "dashscope",
        model,
        stage: "config",
      },
    };
  }

  const endpoint = process.env.DASHSCOPE_ASR_URL?.trim() || DEFAULT_DASHSCOPE_URL;
  const objectKey = buildOssObjectKey();

  try {
    const uploadResult = await uploadAudioToOss(ossConfig, objectKey, audioBuffer);
    if (!uploadResult.ok) {
      return {
        ok: false,
        status: 502,
        body: {
          error: "OSS audio upload failed",
          detail: sanitizeDetail(uploadResult.detail),
          provider: "dashscope",
          model,
          stage: "oss_upload",
          status: uploadResult.status,
        },
      };
    }

    const signedOssUrl = buildOssSignedGetUrl(ossConfig, objectKey, OSS_SIGNED_URL_EXPIRES_SECONDS);
    const createResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model,
        input: { file_urls: [signedOssUrl] },
        parameters: { language_hints: ["zh", "en"] },
      }),
    });

    const createText = await createResponse.text();
    const createPayload = tryParseJson(createText) as DashscopeCreateTaskResponse | null;

    if (!createResponse.ok || !createPayload?.output?.task_id) {
      return {
        ok: false,
        status: 502,
        body: {
          error: "DashScope transcription request failed",
          detail: sanitizeDetail(createText || createPayload?.message || "failed to create task"),
          provider: "dashscope",
          model,
          stage: "request",
          status: createResponse.status,
        },
      };
    }

    const taskId = createPayload.output.task_id;
    const startedAt = Date.now();

    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
      if (Date.now() - startedAt >= POLL_MAX_TOTAL_MS) break;
      const taskResponse = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${encodeURIComponent(taskId)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const taskText = await taskResponse.text();
      const taskPayload = tryParseJson(taskText);
      if (!taskResponse.ok || !taskPayload) {
        return {
          ok: false,
          status: 502,
          body: {
            error: "DashScope transcription request failed",
            detail: sanitizeDetail(taskText || "failed to query task"),
            provider: "dashscope",
            model,
            stage: "query",
            status: taskResponse.status,
          },
        };
      }

      const output = taskPayload.output;
      const taskStatus = output && typeof output === "object" && !Array.isArray(output) ? (output as JsonObject).task_status : undefined;
      if (taskStatus === "SUCCEEDED") {
        const transcript = (await extractDashscopeTaskText(taskPayload)).trim();
        if (!transcript) {
          return {
            ok: false,
            status: 502,
            body: {
              error: "DashScope transcript is empty",
              detail: "任务成功但未提取到有效文本。",
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
      }

      if (taskStatus === "FAILED" || taskStatus === "CANCELED" || taskStatus === "TIMEOUT") {
        return {
          ok: false,
          status: 502,
          body: {
            error: "DashScope transcription request failed",
            detail: sanitizeDetail(taskText),
            provider: "dashscope",
            model,
            stage: "query",
            status: 502,
          },
        };
      }

      if (attempt < POLL_MAX_ATTEMPTS - 1) await sleep(POLL_INTERVAL_MS);
    }

    return {
      ok: false,
      status: 504,
      body: {
        error: "DashScope transcription task timeout",
        detail: "任务轮询超时，请稍后重试。",
        provider: "dashscope",
        model,
        stage: "query",
      },
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
  } finally {
    await deleteOssObject(ossConfig, objectKey);
  }
}

// unchanged below
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
