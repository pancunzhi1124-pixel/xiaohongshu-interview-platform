export const runtime = "nodejs";

import crypto, { createHash, createHmac } from "node:crypto";

const MAX_AUDIO_SIZE_BYTES = 4 * 1024 * 1024;
type TranscribeProvider = "iflytek_raasr" | "iflytek" | "tencent" | "openai" | "aliyun";

type TencentSentenceRecognitionResponse = {
  Result?: string;
  Text?: string;
  FinalSentence?: string;
  Sentence?: string;
  Response?: { Error?: { Code?: string; Message?: string } };
};

type RaasrUploadResponse = Record<string, unknown> & {
  data?: {
    orderId?: string;
    order_id?: string;
  };
  orderId?: string;
  order_id?: string;
};

function extractErrorDetail(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function getProvider(): TranscribeProvider {
  const provider = (process.env.TRANSCRIBE_PROVIDER ?? process.env.ASR_PROVIDER ?? "iflytek_raasr").toLowerCase();
  if (provider === "openai" || provider === "aliyun" || provider === "tencent" || provider === "iflytek" || provider === "xfyun" || provider === "iflytek_raasr") {
    if (provider === "xfyun" || provider === "iflytek") return "iflytek_raasr";
    return provider;
  }
  return "iflytek_raasr";
}

function requireEnv(name: "TENCENT_SECRET_ID" | "TENCENT_SECRET_KEY" | "TENCENT_APP_ID" | "IFLYTEK_RAASR_APP_ID" | "IFLYTEK_RAASR_SECRET_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function isValidWavHeader(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const header = buffer.subarray(0, 12).toString("ascii");
  console.log("audio header:", header);
  return header.includes("RIFF") && header.includes("WAVE");
}

function createRaasrSigna(appId: string, secretKey: string, ts: string): string {
  const baseString = appId + ts;
  const md5 = crypto.createHash("md5").update(baseString).digest("hex");
  return crypto.createHmac("sha1", secretKey).update(md5).digest("base64");
}

function toStrictArrayBuffer(input: Uint8Array): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(input.byteLength);
  new Uint8Array(arrayBuffer).set(input);
  return arrayBuffer;
}

async function transcribeByIflytekRaasr(audioBuffer: Buffer, fileName: string): Promise<{ payload: RaasrUploadResponse; orderId: string }> {
  const appId = requireEnv("IFLYTEK_RAASR_APP_ID");
  const secretKey = requireEnv("IFLYTEK_RAASR_SECRET_KEY");
  const baseUrl = process.env.IFLYTEK_RAASR_API_URL?.trim() || "https://raasr.xfyun.cn/v2/api";
  const uploadUrl = `${baseUrl.replace(/\/$/, "")}/upload`;

  const ts = Math.floor(Date.now() / 1000).toString();
  const signa = createRaasrSigna(appId, secretKey, ts);
  const safeFileName = fileName?.trim() || `interview-${Date.now()}.wav`;
  const duration = Math.max(1, Math.round(audioBuffer.byteLength / 32000));

  const params = new URLSearchParams({
    appId,
    ts,
    signa,
    fileName: safeFileName,
    fileSize: String(audioBuffer.byteLength),
    duration: String(duration),
  });

  console.log("RAASR baseUrl:", baseUrl);
  console.log("RAASR upload URL:", uploadUrl);
  console.log("RAASR upload URL with params without signa:", `${uploadUrl}?appId=${appId}&ts=${ts}&fileName=${safeFileName}&fileSize=${audioBuffer.byteLength}&duration=${duration}`);

  const uploadUrlWithParams = `${uploadUrl}?${params.toString()}`;
  const requestInit: RequestInit = {
    method: "POST",
    headers: new Headers({
      "Content-Type": "application/json; charset=UTF-8",
      Chunked: "false",
    }),
    body: toStrictArrayBuffer(audioBuffer),
  };

  const response = await fetch(uploadUrlWithParams, requestInit);
  const rawText = await response.text();
  let payload: RaasrUploadResponse = {};
  try {
    payload = JSON.parse(rawText) as RaasrUploadResponse;
  } catch {
    payload = { rawText };
  }

  if (!response.ok) {
    const detail = `HTTP ${response.status}: ${rawText}`;
    throw new Error(JSON.stringify({
      error: "Iflytek RAASR upload failed",
      detail,
      provider: "iflytek_raasr",
      status: response.status,
      url: uploadUrl,
    }));
  }

  console.log("RAASR upload raw response:", JSON.stringify(payload));
  const orderId = String(payload.data?.orderId ?? payload.orderId ?? payload.data?.order_id ?? payload.order_id ?? "");

  // TODO: 根据讯飞文档“查询结果”章节，使用 orderId 查询转写结果。
  return { payload, orderId };
}

async function transcribeByTencent(wavBuffer: Buffer): Promise<string> {
  const secretId = requireEnv("TENCENT_SECRET_ID");
  const secretKey = requireEnv("TENCENT_SECRET_KEY");
  requireEnv("TENCENT_APP_ID");

  const region = process.env.TENCENT_ASR_REGION ?? "ap-beijing";
  const engine = process.env.TENCENT_ASR_ENGINE ?? "16k_zh";

  const payload = {
    EngSerViceType: engine,
    SourceType: 1,
    VoiceFormat: "wav",
    Data: wavBuffer.toString("base64"),
    DataLen: wavBuffer.length,
    UsrAudioKey: `interview-${Date.now()}`,
    ProjectId: 0,
  };

  const endpoint = "asr.tencentcloudapi.com";
  const service = "asr";
  const version = "2019-06-14";
  const action = "SentenceRecognition";
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const payloadString = JSON.stringify(payload);
  const hashedPayload = createHash("sha256").update(payloadString).digest("hex");
  const canonicalRequest = `POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:${endpoint}\n\ncontent-type;host\n${hashedPayload}`;
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${createHash("sha256").update(canonicalRequest).digest("hex")}`;
  const secretDate = createHmac("sha256", `TC3${secretKey}`).update(date).digest();
  const secretService = createHmac("sha256", secretDate).update(service).digest();
  const secretSigning = createHmac("sha256", secretService).update("tc3_request").digest();
  const signature = createHmac("sha256", secretSigning).update(stringToSign).digest("hex");
  const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;

  const response = await fetch(`https://${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json; charset=utf-8",
      Host: endpoint,
      "X-TC-Action": action,
      "X-TC-Timestamp": String(timestamp),
      "X-TC-Version": version,
      "X-TC-Region": region,
    },
    body: payloadString,
  });

  const result = (await response.json()) as TencentSentenceRecognitionResponse;
  const errorCode = result.Response?.Error?.Code;
  const errorMessage = result.Response?.Error?.Message;
  if (!response.ok || errorCode) {
    throw new Error(errorMessage ?? "Tencent ASR request failed");
  }

  const transcript = result.Result ?? result.Text ?? result.FinalSentence ?? result.Sentence ?? "";
  if (!transcript.trim()) {
    throw new Error("Tencent ASR returned empty transcript");
  }

  return transcript.trim();
}

export async function POST(request: Request) {
  const provider = getProvider();

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) {
      return Response.json({ error: "Missing audio file" }, { status: 400 });
    }

    console.log("ASR provider:", provider);
    console.log("IFLYTEK_RAASR_APP_ID configured:", Boolean(process.env.IFLYTEK_RAASR_APP_ID?.trim()));
    console.log("IFLYTEK_RAASR_SECRET_KEY configured:", Boolean(process.env.IFLYTEK_RAASR_SECRET_KEY?.trim()));
    console.log("uploaded audio size:", audio.size);
    console.log("uploaded audio type:", audio.type);
    console.log("uploaded audio name:", audio.name);

    if (audio.size > MAX_AUDIO_SIZE_BYTES) {
      return Response.json({ error: "Audio file is too large", detail: "请缩短录音时间，建议每段控制在 15 秒以内。" }, { status: 413 });
    }

    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    if (!isValidWavHeader(audioBuffer)) {
      return Response.json({ error: "Invalid WAV audio", detail: "上传的音频不是标准 WAV。请检查前端 recorder-core 配置。" }, { status: 400 });
    }

    if (provider === "iflytek_raasr") {
      const { payload, orderId } = await transcribeByIflytekRaasr(audioBuffer, audio.name);
      if (orderId) {
        return Response.json({ text: "", provider: "iflytek_raasr", orderId });
      }
      return Response.json({ text: "", provider: "iflytek_raasr", stage: "upload", raw: payload });
    }

    if (provider === "tencent") {
      const text = await transcribeByTencent(audioBuffer);
      return Response.json({ text, provider: "tencent" });
    }

    return Response.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  } catch (error) {
    if (provider === "iflytek_raasr") {
      return Response.json(
        (() => {
          const detail = extractErrorDetail(error);
          try {
            const parsed = JSON.parse(detail) as { error?: string; detail?: string; provider?: string; status?: number; url?: string };
            return {
              error: parsed.error ?? "Iflytek RAASR upload failed",
              detail: parsed.detail ?? detail,
              provider: parsed.provider ?? "iflytek_raasr",
              status: parsed.status,
              url: parsed.url,
            };
          } catch {
            return { error: "Iflytek RAASR transcription failed", detail, provider: "iflytek_raasr" };
          }
        })(),
        { status: 502 },
      );
    }
    return Response.json({ error: "ASR transcription failed", detail: extractErrorDetail(error), provider }, { status: 502 });
  }
}
