"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BrowserSpeechRecognitionConstructor,
  BrowserSpeechRecognitionLike,
  RealtimeAsrStatus,
  RealtimeAsrTokenResponse,
} from "@/lib/asr/types";

type InterviewTarget = "main" | "followup";

export function useRealtimeAsr() {
  const [status, setStatus] = useState<RealtimeAsrStatus>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<BrowserSpeechRecognitionLike | null>(null);
  const currentTargetRef = useRef<InterviewTarget>("main");

  const getBrowserRecognitionCtor = useCallback((): BrowserSpeechRecognitionConstructor | null => {
    if (typeof window === "undefined") return null;
    const maybeCtor = (window as Window & { SpeechRecognition?: BrowserSpeechRecognitionConstructor; webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor }).SpeechRecognition
      ?? (window as Window & { SpeechRecognition?: BrowserSpeechRecognitionConstructor; webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor }).webkitSpeechRecognition;
    return maybeCtor ?? null;
  }, []);

  const isSupported = useMemo(() => Boolean(getBrowserRecognitionCtor()), [getBrowserRecognitionCtor]);

  const stop = useCallback(async (): Promise<string> => {
    setStatus("stopping");
    const recognition = recognitionRef.current;
    recognition?.stop();
    setStatus("stopped");
    setInterimTranscript("");
    return finalTranscript.trim();
  }, [finalTranscript]);

  const cancel = useCallback(() => {
    const recognition = recognitionRef.current;
    recognition?.abort();
    setInterimTranscript("");
    setFinalTranscript("");
    setError("");
    setStatus("idle");
  }, []);

  const setupBrowserRecognition = useCallback((target: InterviewTarget): boolean => {
    const Ctor = getBrowserRecognitionCtor();
    if (!Ctor) {
      setStatus("error");
      setError("当前浏览器不支持实时字幕，请手动输入或使用录音转写 fallback。");
      return false;
    }

    const recognition = new Ctor();
    currentTargetRef.current = target;
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interim = "";
      const finals: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript?.trim() || "";
        if (!transcript) continue;
        if (result.isFinal) {
          finals.push(transcript);
        } else {
          interim += `${transcript} `;
        }
      }
      if (finals.length > 0) {
        setFinalTranscript((prev) => [prev, finals.join(" ")].filter(Boolean).join(" ").trim());
      }
      setInterimTranscript(interim.trim());
    };
    recognition.onerror = (event) => {
      setStatus("error");
      setError(`实时字幕失败：${event.error ?? "unknown"}。请手动输入或使用录音转写 fallback。`);
    };
    recognition.onend = () => {
      setStatus((prev) => (prev === "stopping" ? "stopped" : prev === "error" ? "error" : "idle"));
    };
    recognitionRef.current = recognition;
    recognition.start();
    setStatus("listening");
    return true;
  }, [getBrowserRecognitionCtor]);

  const start = useCallback(async (target: InterviewTarget) => {
    setStatus("starting");
    setError("");
    setInterimTranscript("");
    setFinalTranscript("");

    let tokenPayload: RealtimeAsrTokenResponse | null = null;
    try {
      const response = await fetch("/api/asr/realtime-token");
      tokenPayload = (await response.json()) as RealtimeAsrTokenResponse;
    } catch {
      // fallback to browser
    }

    if (tokenPayload?.supported && tokenPayload.provider === "dashscope_realtime") {
      setStatus("fallback");
      setError("云端实时字幕连接初始化失败，已切换到浏览器实时字幕 / 手动输入模式。");
    } else if (tokenPayload?.reason) {
      setStatus("fallback");
      setError("云端实时字幕暂不可用，已切换到浏览器实时字幕 / 手动输入模式。\n" + tokenPayload.reason);
    }

    setupBrowserRecognition(target);
  }, [setupBrowserRecognition]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
  }, []);

  return { start, stop, cancel, status, interimTranscript, finalTranscript, error, isSupported, currentTarget: currentTargetRef.current };
}
