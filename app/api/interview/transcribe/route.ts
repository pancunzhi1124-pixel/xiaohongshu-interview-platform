import OpenAI from "openai";

export const runtime = "nodejs";

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  console.log("DASHSCOPE_API_KEY configured:", Boolean(process.env.DASHSCOPE_API_KEY));

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "DASHSCOPE_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return Response.json({ error: "Missing audio file" }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_SIZE_BYTES) {
      return Response.json({ error: "Audio file is too large" }, { status: 413 });
    }

    const client = new OpenAI({
      apiKey,
      baseURL: process.env.BAILIAN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });

    const transcription = await client.audio.transcriptions.create({
      file: audio,
      model: process.env.BAILIAN_ASR_MODEL ?? "paraformer-realtime-v2",
    });

    const text = typeof transcription.text === "string" ? transcription.text.trim() : "";
    if (!text) {
      return Response.json({ error: "阿里云转写接口调用失败：未返回文本" }, { status: 502 });
    }

    return Response.json({ text });
  } catch {
    return Response.json({ error: "阿里云转写接口调用失败" }, { status: 502 });
  }
}
