export type RealtimeAsrProvider = "dashscope_realtime" | "browser_realtime";
export type RealtimeAsrStatus = "idle" | "starting" | "listening" | "stopping" | "stopped" | "fallback" | "error";
export type RealtimeAsrTokenResponse = { supported: boolean; provider: RealtimeAsrProvider; model: string; reason?: string; wsUrl?: string; connectionParams?: Record<string, unknown> };
export type RealtimeAsrTranscriptEvent = { target: "main" | "followup"; finalText: string; interimText: string };

type SpeechRecognitionAlternativeLike = { transcript: string; confidence: number };
type SpeechRecognitionResultLike = { isFinal: boolean; length: number; item(index: number): SpeechRecognitionAlternativeLike; [index: number]: SpeechRecognitionAlternativeLike };
export type SpeechRecognitionEventLike = { resultIndex: number; results: { length: number; item(index: number): SpeechRecognitionResultLike; [index: number]: SpeechRecognitionResultLike } };

export type BrowserSpeechRecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
export type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognitionLike;
