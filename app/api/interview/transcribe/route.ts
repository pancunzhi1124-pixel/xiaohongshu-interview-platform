export const runtime = "nodejs";

import { createHash, createHmac } from "node:crypto";

const MAX_AUDIO_SIZE_BYTES = 4 * 1024 * 1024;

type TranscribeProvider = "tencent" | "openai" | "aliyun";

type TencentSentenceRecognitionResponse = {
  Result?: string;
  Text?: string;
  FinalSentence?: string;
  Sentence?: string;
  result?: string;
  RequestId?: string;
};
type TencentErrorResponse = { Response?: { Error?: { Code?: string; Message?: string } } };

function extractErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function getProvider(): TranscribeProvider {
  const provider = process.env.TRANSCRIBE_PROVIDER ?? "tencent";
  if (provider === "openai" || provider === "aliyun" || provider === "tencent") {
    return provider;
  }
  return "tencent";
}

function requireEnv(name: "TENCENT_SECRET_ID" | "TENCENT_SECRET_KEY" | "TENCENT_APP_ID"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function isNearlySilentWav(audioBuffer: Buffer): boolean {
  const header = audioBuffer.subarray(0, 12).toString("ascii");
  if (!header.includes("RIFF") || !header.includes("WAVE")) {
    return false;
  }
  const dataChunkOffset = audioBuffer.indexOf(Buffer.from("data", "ascii"));
  if (dataChunkOffset < 0 || dataChunkOffset + 8 >= audioBuffer.length) {
    return false;
  }
  const dataStart = dataChunkOffset + 8;
  const dataLength = Math.min(audioBuffer.readUInt32LE(dataChunkOffset + 4), audioBuffer.length - dataStart);
  if (dataLength < 2) {
    return true;
  }
  let sumSquares = 0;
  let sampleCount = 0;
  for (let i = dataStart; i + 1 < dataStart + dataLength; i += 2) {
    const sample = audioBuffer.readInt16LE(i) / 32768;
    sumSquares += sample * sample;
    sampleCount += 1;
  }
  if (sampleCount === 0) {
    return true;
  }
  const rms = Math.sqrt(sumSquares / sampleCount);
  return rms < 0.003;
}

async function transcribeByTencent(audio: File): Promise<string> {
  console.log("TENCENT_SECRET_ID configured:", Boolean(process.env.TENCENT_SECRET_ID));
  console.log("TENCENT_SECRET_KEY configured:", Boolean(process.env.TENCENT_SECRET_KEY));
  console.log("TENCENT_APP_ID configured:", Boolean(process.env.TENCENT_APP_ID));

  const secretId = requireEnv("TENCENT_SECRET_ID");
  const secretKey = requireEnv("TENCENT_SECRET_KEY");
  requireEnv("TENCENT_APP_ID");
  const region = process.env.TENCENT_ASR_REGION ?? "ap-beijing";
  const engine = process.env.TENCENT_ASR_ENGINE ?? "16k_zh";

  const audioBuffer = Buffer.from(await audio.arrayBuffer());
  if (isNearlySilentWav(audioBuffer)) {
    const silentError = new Error("Silent audio");
    (silentError as Error & { code?: string }).code = "SILENT_AUDIO";
    throw silentError;
  }
  const header = audioBuffer.subarray(0, 12).toString("ascii");
  console.log("audio header:", header);
  if (!header.includes("RIFF") || !header.includes("WAVE")) {
    const invalidWavError = new Error("Invalid WAV audio");
    (invalidWavError as Error & { code?: string }).code = "INVALID_WAV_AUDIO";
    throw invalidWavError;
  }

  const audioData = audioBuffer.toString("base64");

  const payload = {
    EngSerViceType: engine,
    SourceType: 1,
    VoiceFormat: "wav",
    Data: audioData,
    DataLen: audioBuffer.length,
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

  const result = (await response.json()) as TencentSentenceRecognitionResponse & TencentErrorResponse;
  console.log("Tencent ASR raw response:", JSON.stringify(result));
  const errorCode = result.Response?.Error?.Code;
  const errorMessage = result.Response?.Error?.Message;
  if (!response.ok || errorCode) {
    const error = new Error(errorMessage ?? "Tencent ASR request failed");
    (error as Error & { code?: string }).code = errorCode ?? "UNKNOWN";
    throw error;
  }

  const transcript =
    result.Result
    ?? result.Text
    ?? result.FinalSentence
    ?? result.Sentence
    ?? result.result
    ?? "";
  const text = transcript.trim();
  if (!text) {
    const emptyTranscriptError = new Error("Tencent ASR returned empty transcript");
    (emptyTranscriptError as Error & { code?: string }).code = "TENCENT_EMPTY_TRANSCRIPT";
    throw emptyTranscriptError;
  }

  return text;
}

export async function POST(request: Request) {
  const provider = getProvider();

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return Response.json({ error: "Missing audio file" }, { status: 400 });
    }

    console.log("audio size:", audio.size);
    console.log("audio type:", audio.type);
    console.log("audio name:", audio.name);
    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    console.log("audio header:", audioBuffer.subarray(0, 12).toString("ascii"));

    if (audio.size > MAX_AUDIO_SIZE_BYTES) {
      return Response.json(
        {
          error: "Audio file is too large",
          detail: "请缩短录音时间，建议控制在 60 秒以内。",
        },
        { status: 413 },
      );
    }

    if (provider === "tencent") {
      try {
        const text = await transcribeByTencent(audio);
        return Response.json({ text });
      } catch (error: unknown) {
        const detail = extractErrorDetail(error);
        const code =
          typeof error === "object" && error !== null && "code" in error && typeof (error as { code?: unknown }).code === "string"
            ? (error as { code: string }).code
            : "UNKNOWN";
        if (code === "INVALID_WAV_AUDIO") {
          return Response.json(
            {
              error: "Invalid WAV audio",
              detail: "上传的音频不是标准 WAV，腾讯云无法识别。",
              code,
            },
            { status: 400 },
          );
        }
        if (code === "SILENT_AUDIO") {
          return Response.json(
            {
              error: "Silent audio",
              detail: "录音文件接近静音，请检查浏览器麦克风权限或前端录音编码。",
              code,
            },
            { status: 422 },
          );
        }
        if (code === "TENCENT_EMPTY_TRANSCRIPT") {
          return Response.json(
            {
              error: "Tencent ASR returned empty transcript",
              detail: "腾讯云已返回响应，但未识别到有效文字。请检查音频是否为标准 wav、是否有清晰人声。",
              code,
            },
            { status: 422 },
          );
        }
        const status = detail.includes("not configured") ? 500 : 502;
        return Response.json(
          {
            error: detail.includes("not configured") ? detail : "Tencent ASR transcription failed",
            detail,
            code,
          },
          { status },
        );
      }
    }

    return Response.json(
      {
        error: `Transcription provider '${provider}' is not available`,
        detail: "Only Tencent ASR is enabled in this deployment.",
      },
      { status: 501 },
    );
  } catch (error: unknown) {
    return Response.json(
      {
        error: "Tencent ASR transcription failed",
        detail: extractErrorDetail(error),
        code: "UNKNOWN",
      },
      { status: 502 },
    );
  }
}
