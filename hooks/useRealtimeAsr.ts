"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { RealtimeAsrStatus, RealtimeTokenResponse } from "@/lib/asr/types";

type UseRealtimeAsrOptions = {
  onError?: (message: string) => void;
};

const RECONNECT_LIMIT = 1;

export function useRealtimeAsr(options: UseRealtimeAsrOptions = {}) {
  const [status, setStatus] = useState<RealtimeAsrStatus>("disconnected");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const reconnectCountRef = useRef(0);

  const emitError = useCallback((message: string) => {
    setStatus("failed");
    options.onError?.(message);
  }, [options]);

  const cleanup = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const parseTranscriptMessage = useCallback((raw: string) => {
    try {
      const payload = JSON.parse(raw) as Record<string, unknown>;
      const event = typeof payload.event === "string" ? payload.event : "";
      const text = typeof payload.text === "string" ? payload.text : "";
      if (!text) return;
      if (event.toLowerCase().includes("final")) {
        setFinalTranscript((prev) => (prev ? `${prev} ${text}`.trim() : text.trim()));
        setInterimTranscript("");
        return;
      }
      setInterimTranscript(text);
    } catch {
      // 非 JSON 消息忽略，避免打断主流程。
    }
  }, []);

  const getToken = useCallback(async (): Promise<RealtimeTokenResponse> => {
    const response = await fetch("/api/asr/realtime-token", { method: "GET" });
    const data = (await response.json()) as RealtimeTokenResponse & { error?: string; detail?: string };
    if (!response.ok) {
      throw new Error(data.detail || data.error || "实时字幕连接参数获取失败");
    }
    return data;
  }, []);

  const start = useCallback(async () => {
    if (status === "connecting" || status === "listening") return;
    setStatus("connecting");
    setInterimTranscript("");

    try {
      const token = await getToken();
      const wsEndpoint = token.signedUrl || token.wsUrl;
      if (!wsEndpoint) {
        throw new Error("实时字幕不可用，可使用录音转写模式");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ws = new WebSocket(wsEndpoint, token.subprotocols);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("listening");
        reconnectCountRef.current = 0;
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        recorderRef.current = recorder;
        recorder.ondataavailable = async (event) => {
          if (!event.data || event.data.size === 0 || ws.readyState !== WebSocket.OPEN) return;
          ws.send(await event.data.arrayBuffer());
        };
        recorder.start(250);
      };

      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          parseTranscriptMessage(event.data);
        }
      };

      ws.onerror = () => {
        emitError("实时字幕不可用，可使用录音转写模式");
      };

      ws.onclose = () => {
        if (status === "listening" && reconnectCountRef.current < RECONNECT_LIMIT) {
          reconnectCountRef.current += 1;
          setStatus("reconnecting");
          setTimeout(() => {
            void start();
          }, 600);
          return;
        }
        if (status !== "failed") {
          setStatus("disconnected");
        }
      };
    } catch (error) {
      cleanup();
      emitError(error instanceof Error ? error.message : "实时字幕不可用，可使用录音转写模式");
    }
  }, [cleanup, emitError, getToken, parseTranscriptMessage, status]);

  const stopAndCommit = useCallback(() => {
    cleanup();
    setStatus("disconnected");
    setInterimTranscript("");
    return finalTranscript.trim();
  }, [cleanup, finalTranscript]);

  const cancel = useCallback(() => {
    cleanup();
    setStatus("disconnected");
    setInterimTranscript("");
    setFinalTranscript("");
  }, [cleanup]);

  return useMemo(() => ({ status, interimTranscript, finalTranscript, start, stopAndCommit, cancel }), [cancel, finalTranscript, interimTranscript, start, status, stopAndCommit]);
}
