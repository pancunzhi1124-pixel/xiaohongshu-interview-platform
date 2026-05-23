import { NextResponse } from "next/server";
import type { RealtimeAsrTokenResponse } from "@/lib/asr/types";

function getModel(): string {
  return process.env.REALTIME_ASR_MODEL?.trim() || "paraformer-realtime-8k-v2";
}

export async function GET() {
  const provider = process.env.ASR_PROVIDER?.trim() || "browser_realtime";
  const model = getModel();

  if (provider !== "dashscope_realtime") {
    const body: RealtimeAsrTokenResponse = {
      supported: false,
      provider: "browser_realtime",
      model,
      reason: "ASR_PROVIDER is not dashscope_realtime; using browser realtime captions.",
    };
    return NextResponse.json(body, { status: 200 });
  }

  const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        supported: false,
        provider: "dashscope_realtime",
        model,
        reason: "DASHSCOPE_API_KEY is missing on server; fallback to browser realtime captions.",
      } satisfies RealtimeAsrTokenResponse,
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      supported: false,
      provider: "dashscope_realtime",
      model,
      reason:
        "DashScope realtime currently requires secure server-side authorization during WebSocket handshake. Browser native WebSocket cannot safely attach the required auth headers without exposing secrets, so browser falls back to Web Speech API.",
    } satisfies RealtimeAsrTokenResponse,
    { status: 200 },
  );
}
