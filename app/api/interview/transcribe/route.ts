export const runtime = "nodejs";

import { createHash, createHmac } from "node:crypto";

const MAX_AUDIO_SIZE_BYTES = 4 * 1024 * 1024;
const RAASR_POLL_INTERVAL_MS = 2000;
const RAASR_MAX_WAIT_MS = 90000;

type TranscribeProvider = "iflytek_raasr" | "iflytek" | "tencent" | "openai" | "aliyun";

type TencentSentenceRecognitionResponse = {
  Result?: string;
  Text?: string;
  FinalSentence?: string;
  Sentence?: string;
  Response?: { Error?: { Code?: string; Message?: string } };
};

type RaasrApiResponse<T> = {
  ok: number;
  err_no?: number;
  failed?: string;
  data?: T;
};

type RaasrPrepareData = {
  taskid?: string;
};

type RaasrProgressData = {
  status?: number;
  desc?: string;
};

type RaasrResultSegment = {
  onebest?: string;
};

type RaasrResultData = string | RaasrResultSegment[];

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

function requireEnv(name: "TENCENT_SECRET_ID" | "TENCENT_SECRET_KEY" | "TENCENT_APP_ID" | "IFLYTEK_RAASR_APP_ID" | "IFLYTEK_RAASR_SECRET_KEY" | "IFLYTEK_RAASR_API_URL"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function isValidWavHeader(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const header = buffer.subarray(0, 12).toString("ascii");
  console.log("uploaded wav header:", header);
  return header.includes("RIFF") && header.includes("WAVE");
}

function buildRaasrAuth(secretKey: string, appId: string): { ts: string; signa: string } {
  const ts = Math.floor(Date.now() / 1000).toString();
  const md5 = createHash("md5").update(appId + ts).digest("hex");
  const signa = createHmac("sha1", secretKey).update(md5).digest("base64");
  return { ts, signa };
}

async function raasrRequest<T>(apiUrl: string, path: string, params: URLSearchParams, body?: Buffer): Promise<RaasrApiResponse<T>> {
  const url = `${apiUrl}${path}?${params.toString()}`;
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/octet-stream" } : undefined,
    body,
  });
  const payload = (await response.json()) as RaasrApiResponse<T>;
  if (!response.ok || payload.ok !== 0) {
    throw new Error(payload.failed ?? `HTTP ${response.status}`);
  }
  return payload;
}

async function transcribeByIflytekRaasr(audioBuffer: Buffer, fileName: string): Promise<string> {
  const appId = requireEnv("IFLYTEK_RAASR_APP_ID");
  const secretKey = requireEnv("IFLYTEK_RAASR_SECRET_KEY");
  const apiUrl = requireEnv("IFLYTEK_RAASR_API_URL").replace(/\/$/, "");
  const { ts, signa } = buildRaasrAuth(secretKey, appId);

  const common = new URLSearchParams({ appId, signa, ts });
  const prepareParams = new URLSearchParams(common);
  prepareParams.set("fileName", fileName || `interview-${Date.now()}.wav`);
  prepareParams.set("fileSize", String(audioBuffer.length));
  prepareParams.set("duration", "200");

  const prepare = await raasrRequest<RaasrPrepareData>(apiUrl, "/prepare", prepareParams);
  const taskId = prepare.data?.taskid?.toString().trim();
  if (!taskId) throw new Error("Iflytek RAASR missing task id");

  const uploadParams = new URLSearchParams(common);
  uploadParams.set("taskId", taskId);
  await raasrRequest<Record<string, never>>(apiUrl, "/upload", uploadParams, audioBuffer);

  const mergeParams = new URLSearchParams(common);
  mergeParams.set("taskId", taskId);
  await raasrRequest<Record<string, never>>(apiUrl, "/merge", mergeParams);

  const startedAt = Date.now();
  while (Date.now() - startedAt < RAASR_MAX_WAIT_MS) {
    const progressParams = new URLSearchParams(common);
    progressParams.set("taskId", taskId);
    const progress = await raasrRequest<RaasrProgressData>(apiUrl, "/getProgress", progressParams);
    const status = Number(progress.data?.status ?? -1);
    if (status === 9) break;
    if (status < 0) {
      throw new Error(progress.data?.desc ?? "Iflytek RAASR progress failed");
    }
    await new Promise<void>((resolve) => setTimeout(resolve, RAASR_POLL_INTERVAL_MS));
  }

  const resultParams = new URLSearchParams(common);
  resultParams.set("taskId", taskId);
  const result = await raasrRequest<RaasrResultData>(apiUrl, "/getResult", resultParams);
  const data = result.data;

  if (typeof data === "string") {
    const text = data.trim();
    if (text) return text;
  }

  if (Array.isArray(data)) {
    const merged = data
      .map((item) => item.onebest?.trim() ?? "")
      .filter((item) => item.length > 0)
      .join("\n")
      .trim();
    if (merged) return merged;
  }

  throw new Error("Iflytek RAASR returned empty transcript");
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
      const text = await transcribeByIflytekRaasr(audioBuffer, audio.name);
      return Response.json({ text, provider: "iflytek_raasr" });
    }

    if (provider === "tencent") {
      const text = await transcribeByTencent(audioBuffer);
      return Response.json({ text, provider: "tencent" });
    }

    return Response.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  } catch (error) {
    if (provider === "iflytek_raasr") {
      return Response.json(
        { error: "Iflytek RAASR transcription failed", detail: extractErrorDetail(error), provider: "iflytek_raasr" },
        { status: 502 },
      );
    }
    return Response.json({ error: "ASR transcription failed", detail: extractErrorDetail(error), provider }, { status: 502 });
  }
}
