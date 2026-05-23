export const runtime = "nodejs";

import { createHash, createHmac } from "node:crypto";

const MAX_AUDIO_SIZE_BYTES = 4 * 1024 * 1024;

type TranscribeProvider = "iflytek" | "tencent" | "openai" | "aliyun";

type TencentSentenceRecognitionResponse = {
  Result?: string;
  Text?: string;
  FinalSentence?: string;
  Sentence?: string;
  Response?: { Error?: { Code?: string; Message?: string } };
};

function extractErrorDetail(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function getProvider(): TranscribeProvider {
  const provider = (process.env.TRANSCRIBE_PROVIDER ?? process.env.ASR_PROVIDER ?? "iflytek").toLowerCase();
  if (provider === "openai" || provider === "aliyun" || provider === "tencent" || provider === "iflytek" || provider === "xfyun") {
    return provider === "xfyun" ? "iflytek" : provider;
  }
  return "iflytek";
}

function requireEnv(name: "TENCENT_SECRET_ID" | "TENCENT_SECRET_KEY" | "TENCENT_APP_ID"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function isValidWavHeader(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const header = buffer.subarray(0, 12).toString("ascii");
  console.log("uploaded wav header:", header);
  return header.includes("RIFF") && header.includes("WAVE");
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
  console.log("Tencent ASR raw response:", JSON.stringify(result));

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
  console.log("TRANSCRIBE_PROVIDER:", process.env.TRANSCRIBE_PROVIDER);
  const provider = getProvider();
  if (provider === "iflytek") {
    return Response.json({ error: "IFlyTek ASR not configured", detail: "语音转写失败，请检查 ASR 配置，或手动输入回答。" }, { status: 502 });
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) {
      return Response.json({ error: "Missing audio file" }, { status: 400 });
    }

    console.log("uploaded audio name:", audio.name);
    console.log("uploaded audio type:", audio.type);
    console.log("uploaded audio size:", audio.size);

    if (audio.size > MAX_AUDIO_SIZE_BYTES) {
      return Response.json({ error: "Audio file is too large", detail: "请缩短录音时间，建议每段控制在 15 秒以内。" }, { status: 413 });
    }

    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    if (!isValidWavHeader(audioBuffer)) {
      return Response.json(
        {
          error: "Invalid WAV audio",
          detail: "上传的音频不是标准 WAV。请检查前端 recorder-core 配置。",
        },
        { status: 400 },
      );
    }

    if (provider === "tencent") {
      const text = await transcribeByTencent(audioBuffer);
      return Response.json({ text });
    }

    return Response.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: "ASR transcription failed", detail: extractErrorDetail(error) }, { status: 502 });
  }
}
