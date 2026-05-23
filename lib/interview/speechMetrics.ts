export type SpeechSegment = {
  text: string;
  startMs: number;
  endMs: number;
};

export type FillerWordStats = {
  word: string;
  count: number;
  perMinute: number;
  highFrequency: boolean;
};

export type SpeechMetrics = {
  totalDurationMs: number;
  chineseCharCount: number;
  speakingRateCharPerMinute: number;
  fillerWordCount: number;
  fillerWords: FillerWordStats[];
  pauseCount: number;
  longPauseCount: number;
  maxPauseMs: number;
  fluencyScore: number;
  pauseSupport: "basic" | "realtime";
};

const DEFAULT_FILLER_WORDS = ["嗯", "呃", "额", "然后", "就是", "这个", "那个", "对吧", "是吧", "啊"];
const LONG_PAUSE_THRESHOLD_MS = 1200;
const GENERAL_HIGH_FREQ_PER_MINUTE = 6;
const RANHOU_HIGH_FREQ_PER_MINUTE = 10;

function countOccurrences(text: string, needle: string): number {
  if (!text || !needle) return 0;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "g");
  return text.match(regex)?.length ?? 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function countChineseChars(text: string): number {
  const matched = text.match(/[\u3400-\u9FFF]/g);
  return matched?.length ?? 0;
}

export function calculateSpeechMetrics(input: {
  transcript: string;
  totalDurationMs: number;
  segments?: SpeechSegment[];
  fillerCandidates?: string[];
}): SpeechMetrics {
  const transcript = (input.transcript ?? "").trim();
  const normalizedDurationMs = Math.max(0, Math.round(input.totalDurationMs || 0));
  const durationMinutes = normalizedDurationMs > 0 ? normalizedDurationMs / 60000 : 0;
  const chineseCharCount = countChineseChars(transcript);
  const speakingRateCharPerMinute = durationMinutes > 0 ? Math.round((chineseCharCount / durationMinutes) * 10) / 10 : 0;

  const fillerCandidates = (input.fillerCandidates?.length ? input.fillerCandidates : DEFAULT_FILLER_WORDS)
    .map((item) => item.trim())
    .filter(Boolean);

  const fillerWords = fillerCandidates
    .map((word) => {
      const count = countOccurrences(transcript, word);
      const perMinute = durationMinutes > 0 ? Math.round((count / durationMinutes) * 100) / 100 : 0;
      const threshold = word === "然后" ? RANHOU_HIGH_FREQ_PER_MINUTE : GENERAL_HIGH_FREQ_PER_MINUTE;
      return { word, count, perMinute, highFrequency: perMinute >= threshold };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const fillerWordCount = fillerWords.reduce((sum, item) => sum + item.count, 0);

  const sortedSegments = (input.segments ?? [])
    .filter((segment) => Number.isFinite(segment.startMs) && Number.isFinite(segment.endMs) && segment.endMs >= segment.startMs)
    .sort((a, b) => a.startMs - b.startMs);

  let pauseCount = 0;
  let longPauseCount = 0;
  let maxPauseMs = 0;

  if (sortedSegments.length > 1) {
    for (let i = 1; i < sortedSegments.length; i += 1) {
      const gap = Math.max(0, sortedSegments[i].startMs - sortedSegments[i - 1].endMs);
      if (gap <= 0) continue;
      pauseCount += 1;
      maxPauseMs = Math.max(maxPauseMs, gap);
      if (gap >= LONG_PAUSE_THRESHOLD_MS) longPauseCount += 1;
    }
  }

  let fluencyScore = 10;
  if (speakingRateCharPerMinute > 0) {
    if (speakingRateCharPerMinute < 110 || speakingRateCharPerMinute > 320) fluencyScore -= 2;
    else if (speakingRateCharPerMinute < 140 || speakingRateCharPerMinute > 280) fluencyScore -= 1;
  }

  if (durationMinutes > 0) {
    const fillerPerMin = fillerWordCount / durationMinutes;
    if (fillerPerMin >= 12) fluencyScore -= 3;
    else if (fillerPerMin >= 8) fluencyScore -= 2;
    else if (fillerPerMin >= 4) fluencyScore -= 1;
  }

  if (sortedSegments.length > 1) {
    fluencyScore -= Math.min(2, longPauseCount);
    if (maxPauseMs >= 3000) fluencyScore -= 1;
  }

  fluencyScore = Math.round(clamp(fluencyScore, 1, 10) * 10) / 10;

  return {
    totalDurationMs: normalizedDurationMs,
    chineseCharCount,
    speakingRateCharPerMinute,
    fillerWordCount,
    fillerWords,
    pauseCount,
    longPauseCount,
    maxPauseMs,
    fluencyScore,
    pauseSupport: sortedSegments.length > 1 ? "realtime" : "basic",
  };
}
