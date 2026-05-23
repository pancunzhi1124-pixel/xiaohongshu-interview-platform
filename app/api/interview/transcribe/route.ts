export const runtime = "nodejs";

import { execFile } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { chmod, readFile, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const MAX_AUDIO_SIZE_BYTES = 4 * 1024 * 1024;
const execFileAsync = promisify(execFile);

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
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function getProvider(): TranscribeProvider {
  const provider = process.env.TRANSCRIBE_PROVIDER ?? "tencent";
  if (provider === "openai" || provider === "aliyun" || provider === "tencent") return provider;
  return "tencent";
}

function requireEnv(name: "TENCENT_SECRET_ID" | "TENCENT_SECRET_KEY" | "TENCENT_APP_ID"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function convertToWav(inputPath: string, outputPath: string): Promise<void> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not provide a binary path.");
  }

  await chmod(ffmpegPath, 0o755).catch(() => {});

  const result = await execFileAsync(
    ffmpegPath,
    ["-y", "-i", inputPath, "-ac", "1", "-ar", "16000", "-acodec", "pcm_s16le", outputPath],
    { timeout: 30000 },
  );

  console.log("ffmpeg stdout:", result.stdout);
  console.log("ffmpeg stderr:", result.stderr);
}

async function transcribeByTencent(wavBuffer: Buffer): Promise<string> {
  console.log("TENCENT_SECRET_ID configured:", Boolean(process.env.TENCENT_SECRET_ID));
  console.log("TENCENT_SECRET_KEY configured:", Boolean(process.env.TENCENT_SECRET_KEY));
  console.log("TENCENT_APP_ID configured:", Boolean(process.env.TENCENT_APP_ID));

  const secretId = requireEnv("TENCENT_SECRET_ID");
  const secretKey = requireEnv("TENCENT_SECRET_KEY");
  requireEnv("TENCENT_APP_ID");
  const region = process.env.TENCENT_ASR_REGION ?? "ap-beijing";
  const engine = process.env.TENCENT_ASR_ENGINE ?? "16k_zh";

  const audioData = wavBuffer.toString("base64");
  const payload = {
    EngSerViceType: engine,
    SourceType: 1,
    VoiceFormat: "wav",
    Data: audioData,
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

  const result = (await response.json()) as TencentSentenceRecognitionResponse & TencentErrorResponse;
  console.log("Tencent ASR raw response:", JSON.stringify(result));

  const errorCode = result.Response?.Error?.Code;
  const errorMessage = result.Response?.Error?.Message;
  if (!response.ok || errorCode) {
    const error = new Error(errorMessage ?? "Tencent ASR request failed");
    (error as Error & { code?: string }).code = errorCode ?? "UNKNOWN";
    throw error;
  }

  const transcript = result.Result ?? result.Text ?? result.FinalSentence ?? result.Sentence ?? result.result ?? "";
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
  console.log("TRANSCRIBE_PROVIDER:", process.env.TRANSCRIBE_PROVIDER);

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) return Response.json({ error: "Missing audio file" }, { status: 400 });

    if (!ffmpegPath) {
      return Response.json(
        { error: "FFmpeg is not available", detail: "ffmpeg-static did not provide a binary path." },
        { status: 500 },
      );
    }

    const inputPath = path.join(os.tmpdir(), `input-${Date.now()}.webm`);
    const outputPath = path.join(os.tmpdir(), `output-${Date.now()}.wav`);

    console.log("ffmpeg path:", ffmpegPath);
    console.log("uploaded audio size:", audio.size);
    console.log("uploaded audio type:", audio.type);
    console.log("uploaded audio name:", audio.name);
    console.log("input path:", inputPath);
    console.log("output path:", outputPath);

    if (audio.size > MAX_AUDIO_SIZE_BYTES) {
      return Response.json({ error: "Audio file is too large", detail: "请缩短录音时间，建议控制在 60 秒以内。" }, { status: 413 });
    }

    try {
      await writeFile(inputPath, Buffer.from(await audio.arrayBuffer()));
      await convertToWav(inputPath, outputPath);

      const wavBuffer = await readFile(outputPath);
      console.log("converted wav size:", wavBuffer.length);
      console.log("converted wav header:", wavBuffer.subarray(0, 12).toString("ascii"));

      const header = wavBuffer.subarray(0, 12).toString("ascii");
      if (!header.includes("RIFF") || !header.includes("WAVE")) {
        return Response.json(
          { error: "Invalid converted WAV audio", detail: "ffmpeg did not generate a valid WAV file." },
          { status: 500 },
        );
      }

      if (provider !== "tencent") {
        return Response.json(
          {
            error: `Transcription provider '${provider}' is not available`,
            detail: "Only Tencent ASR is enabled in this deployment.",
          },
          { status: 501 },
        );
      }

      try {
        const text = await transcribeByTencent(wavBuffer);
        return Response.json({ text });
      } catch (error: unknown) {
        const detail = extractErrorDetail(error);
        const code =
          typeof error === "object" && error !== null && "code" in error && typeof (error as { code?: unknown }).code === "string"
            ? (error as { code: string }).code
            : "UNKNOWN";
        if (code === "TENCENT_EMPTY_TRANSCRIPT") {
          return Response.json(
            { error: "Tencent ASR returned empty transcript", detail: "腾讯云未识别到有效语音，请靠近麦克风清晰说话。" },
            { status: 422 },
          );
        }
        const status = detail.includes("not configured") ? 500 : 502;
        return Response.json({ error: detail.includes("not configured") ? detail : "Tencent ASR transcription failed", detail, code }, { status });
      }
    } catch (error: unknown) {
      console.error("ffmpeg conversion failed:", error);
      return Response.json(
        { error: "Audio conversion failed", detail: error instanceof Error ? error.message : "Unknown ffmpeg error" },
        { status: 500 },
      );
    } finally {
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
    }
  } catch (error: unknown) {
    return Response.json({ error: "Tencent ASR transcription failed", detail: extractErrorDetail(error), code: "UNKNOWN" }, { status: 502 });
  }
}
