import crypto from "node:crypto";

const DEFAULT_WS_URL = "wss://dashscope.aliyuncs.com/api-ws/v1/inference";

export async function GET() {
  const model = process.env.REALTIME_ASR_MODEL?.trim() || "paraformer-realtime-8k-v2";
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
  const signedUrl = process.env.DASHSCOPE_REALTIME_SIGNED_URL?.trim();
  const wsUrl = process.env.DASHSCOPE_REALTIME_WS_URL?.trim() || DEFAULT_WS_URL;

  if (!apiKey && !signedUrl) {
    return Response.json(
      {
        error: "Realtime ASR unavailable",
        detail: "未配置 DASHSCOPE_API_KEY 或 DASHSCOPE_REALTIME_SIGNED_URL，实时字幕已禁用。",
      },
      { status: 503 },
    );
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  if (signedUrl) {
    return Response.json({ provider: "custom", model, signedUrl, expiresAt });
  }

  const nonce = crypto.randomBytes(8).toString("hex");
  const tempToken = crypto.createHmac("sha256", apiKey as string).update(`${model}:${expiresAt}:${nonce}`).digest("hex");

  return Response.json({
    provider: "dashscope",
    model,
    wsUrl,
    expiresAt,
    headers: {
      "X-Realtime-Model": model,
      "X-Realtime-Nonce": nonce,
      "X-Realtime-Token": tempToken,
    },
  });
}
