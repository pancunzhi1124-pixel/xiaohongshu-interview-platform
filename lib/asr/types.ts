export type RealtimeAsrStatus = "disconnected" | "connecting" | "listening" | "reconnecting" | "failed";

export type RealtimeTokenProvider = "dashscope" | "custom";

export type RealtimeTokenResponse = {
  provider: RealtimeTokenProvider;
  model: string;
  expiresAt: string;
  signedUrl?: string;
  wsUrl?: string;
  headers?: Record<string, string>;
  subprotocols?: string[];
};

export type RealtimeTranscriptPayload = {
  interimTranscript: string;
  finalTranscript: string;
};
