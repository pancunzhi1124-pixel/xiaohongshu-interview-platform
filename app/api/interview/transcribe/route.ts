export const runtime = "nodejs";

const MAX_AUDIO_SIZE_BYTES = 4 * 1024 * 1024;

type AliyunSuccessResponse = {
  text?: string;
};

function extractErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

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

    console.log("audio size:", audio.size);
    console.log("audio type:", audio.type);
    console.log("audio name:", audio.name);

    if (audio.size > MAX_AUDIO_SIZE_BYTES) {
      return Response.json(
        {
          error: "Audio file is too large",
          detail: "请缩短录音时间，建议控制在 60 秒以内。",
        },
        { status: 413 },
      );
    }

    const aliyunFormData = new FormData();
    aliyunFormData.append("file", audio);
    aliyunFormData.append("model", process.env.BAILIAN_ASR_MODEL ?? "paraformer-realtime-v2");

    const aliyunResponse = await fetch(
      `${process.env.BAILIAN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1"}/audio/transcriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: aliyunFormData,
      },
    );

    const responseText = await aliyunResponse.text();

    if (!aliyunResponse.ok) {
      console.error("Aliyun transcription failed:", {
        status: aliyunResponse.status,
        responseText,
      });

      return Response.json(
        {
          error: "Aliyun transcription failed",
          status: aliyunResponse.status,
          detail: responseText,
        },
        { status: 502 },
      );
    }

    let transcription: AliyunSuccessResponse;
    try {
      transcription = JSON.parse(responseText) as AliyunSuccessResponse;
    } catch {
      return Response.json(
        {
          error: "Aliyun transcription failed",
          status: aliyunResponse.status,
          detail: responseText,
        },
        { status: 502 },
      );
    }

    const text = typeof transcription.text === "string" ? transcription.text.trim() : "";
    if (!text) {
      return Response.json(
        {
          error: "Aliyun transcription failed",
          status: aliyunResponse.status,
          detail: responseText || "未返回文本",
        },
        { status: 502 },
      );
    }

    return Response.json({ text });
  } catch (error: unknown) {
    return Response.json(
      {
        error: "Aliyun transcription failed",
        detail: extractErrorDetail(error),
      },
      { status: 502 },
    );
  }
}
