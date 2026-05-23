export const runtime = "nodejs";

import { createHmac } from "node:crypto";

function requireEnv(name: "XFYUN_APP_ID" | "XFYUN_API_KEY" | "XFYUN_API_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function GET() {
  try {
    const apiKey = requireEnv("XFYUN_API_KEY");
    const apiSecret = requireEnv("XFYUN_API_SECRET");
    const appId = requireEnv("XFYUN_APP_ID");

    const host = "ws-api.xfyun.cn";
    const path = "/v2/iat";
    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
    const signature = createHmac("sha256", apiSecret).update(signatureOrigin).digest("base64");
    const authorizationOrigin = `api_key=\"${apiKey}\", algorithm=\"hmac-sha256\", headers=\"host date request-line\", signature=\"${signature}\"`;
    const authorization = Buffer.from(authorizationOrigin).toString("base64");

    const wsUrl = `wss://${host}${path}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${host}`;
    return Response.json({ wsUrl, appId });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: "Failed to create XFYun auth", detail }, { status: 500 });
  }
}
