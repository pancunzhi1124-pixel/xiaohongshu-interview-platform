"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { interviewBanks, type InterviewQuestion, type InterviewRound } from "@/data/question-banks";
import InterviewIntensitySelector from "@/components/InterviewIntensitySelector";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import FloatingOrbs from "@/components/ui/FloatingOrbs";
import GlassCard from "@/components/ui/GlassCard";
import SmartSelect from "@/components/ui/SmartSelect";
import RecorderCore from "recorder-core";
import "recorder-core/src/engine/wav";

type RecorderCoreInstance = {
  open: (
    onSuccess: () => void,
    onError: (message: string, isUserNotAllow?: boolean) => void
  ) => void;
  start: () => void;
  stop: (
    onSuccess: (blob: Blob, duration: number) => void,
    onError: (message: string) => void
  ) => void;
  close: () => void;
};

type RecorderFactoryOptions = {
  type: "wav";
  sampleRate: number;
  bitRate: number;
  numChannels?: number;
  onProcess?: () => void;
};

type RecorderFactory = (options: RecorderFactoryOptions) => RecorderCoreInstance;

const createRecorder = RecorderCore as unknown as RecorderFactory;

type PublicInterviewModeKey =
  | "structured-mixed"
  | "analysis"
  | "organization"
  | "communication"
  | "emergency"
  | "position-awareness"
  | "scenario";

type PrivateInterviewRoundKey =
  | "hr"
  | "business"
  | "manager"
  | "final"
  | "stress"
  | "english"
  | "project-followup";

type InterviewModeKey = PublicInterviewModeKey | PrivateInterviewRoundKey;
type RoundFilter = PrivateInterviewRoundKey | "";

type PublicInterviewModeOption = {
  value: PublicInterviewModeKey;
  label: string;
  description: string;
  modeLabel: string;
  keywords: readonly string[];
};

type PrivateInterviewRoundOption = {
  value: PrivateInterviewRoundKey;
  label: string;
  description: string;
  roundLabel: string;
  round: InterviewRound;
  keywords: readonly string[];
};

type InterviewModeOption = PublicInterviewModeOption | PrivateInterviewRoundOption;
type InterviewUiKind = "public-structured" | "private-company";
type StructuredBankId =
  | "national-civil-service"
  | "provincial-civil-service"
  | "public-institution"
  | "state-owned-enterprise"
  | "private-company";

function isPrivateRoundOption(option: InterviewModeOption): option is PrivateInterviewRoundOption {
  return "roundLabel" in option;
}

function getInterviewUiKind(inputId: string, inputName?: string): InterviewUiKind {
  const text = `${inputId} ${inputName ?? ""}`.toLowerCase();

  if (
    text.includes("private-company")
    || text.includes("通用求职")
    || text.includes("私企")
    || text.includes("民企")
    || text.includes("求职面试")
  ) {
    return "private-company";
  }

  if (
    text.includes("national-civil-service")
    || text.includes("provincial-civil-service")
    || text.includes("public-institution")
    || text.includes("state-owned-enterprise")
    || text.includes("国考")
    || text.includes("省考")
    || text.includes("事业编")
    || text.includes("事业单位")
    || text.includes("公务员")
    || text.includes("选调")
    || text.includes("国企")
    || text.includes("央企")
    || text.includes("银行结构化")
  ) {
    return "public-structured";
  }

  return "private-company";
}

const defaultPrivateRoundOption = {
  value: "hr",
  label: "HR 初面",
  description: "动机、稳定性、表达",
  roundLabel: "HR 初面",
  round: "HR",
  keywords: ["自我介绍", "动机", "优势", "稳定"],
} satisfies PrivateInterviewRoundOption;

const privateRoundOptions: readonly PrivateInterviewRoundOption[] = [
  defaultPrivateRoundOption,
  {
    value: "business",
    label: "业务面",
    description: "岗位能力与案例",
    roundLabel: "业务面",
    round: "业务",
    keywords: ["能力", "案例", "专业"],
  },
  {
    value: "manager",
    label: "主管面",
    description: "执行、协作与结果",
    roundLabel: "主管面",
    round: "主管",
    keywords: ["协作", "项目", "解决"],
  },
  {
    value: "final",
    label: "终面",
    description: "长期规划与匹配度",
    roundLabel: "终面",
    round: "终面",
    keywords: ["价值观", "规划", "判断"],
  },
  {
    value: "stress",
    label: "压力面",
    description: "抗压与应变能力",
    roundLabel: "压力面",
    round: "压力",
    keywords: ["压力", "冲突", "反问"],
  },
  {
    value: "english",
    label: "英文面试",
    description: "英文表达与沟通",
    roundLabel: "英文面",
    round: "英文",
    keywords: ["英文", "english"],
  },
  {
    value: "project-followup",
    label: "项目经历追问",
    description: "围绕项目细节深挖追问",
    roundLabel: "项目经历追问",
    round: "综合",
    keywords: ["项目", "经历", "负责", "难点", "复盘", "结果"],
  },
] as const;
const defaultPublicModeOption = {
  value: "structured-mixed",
  label: "结构化综合面",
  description: "混合抽取综合分析、组织管理、人际沟通、应急应变等题型",
  modeLabel: "结构化综合面",
  keywords: ["综合分析", "组织", "沟通", "应急"],
} satisfies PublicInterviewModeOption;

const publicModeOptions: readonly PublicInterviewModeOption[] = [
  defaultPublicModeOption,
  { value: "analysis", label: "综合分析专项", description: "社会现象、政策理解、观点态度", modeLabel: "综合分析专项", keywords: ["综合分析", "社会现象", "政策理解", "观点理解", "现象", "看法"] },
  { value: "organization", label: "组织管理专项", description: "调研、宣传、培训、会议、活动组织", modeLabel: "组织管理专项", keywords: ["组织", "调研", "宣传", "培训", "会议", "活动", "检查", "座谈"] },
  { value: "communication", label: "人际沟通专项", description: "领导、同事、群众、服务对象沟通", modeLabel: "人际沟通专项", keywords: ["人际", "沟通", "领导", "同事", "群众", "协调", "矛盾"] },
  { value: "emergency", label: "应急应变专项", description: "突发事件、舆情、安全、群众矛盾处理", modeLabel: "应急应变专项", keywords: ["应急", "突发", "舆情", "安全", "事故", "现场", "处理"] },
  { value: "position-awareness", label: "岗位认知专项", description: "岗位理解、职业规划、责任担当", modeLabel: "岗位认知专项", keywords: ["岗位", "认知", "职业", "规划", "初心", "责任", "担当"] },
  { value: "scenario", label: "情景模拟专项", description: "现场劝说、沟通解释、模拟发言", modeLabel: "情景模拟专项", keywords: ["模拟", "劝说", "现场", "发言", "沟通", "解释"] },
] as const;


type InterviewStatus =
  | "idle"
  | "asking"
  | "listening"
  | "analyzing"
  | "followup_asking"
  | "followup_listening"
  | "completed";

type InterviewTarget = "main" | "followup";

type ReportItem = {
  question: string;
  answer: string;
  followUpAnswer?: string;
  score: number;
  feedback: string;
};
type AudioDiagnostics = {
  durationSeconds: number;
  chunkCount: number;
  chunkSizes: number[];
  mimeType: "audio/wav";
  uploadedForTranscription: boolean;
};
type RecorderStatus = "未启动" | "启动中" | "录音中" | "停止中" | "失败";
type MicPermissionStatus = "已授权" | "未授权" | "未知";

type EvaluationResponse = {
  score: number;
  followUpNeeded: boolean;
  followUpQuestion: string;
  shortFeedback: string;
};
type StructuredQuestion = {
  id: string;
  bankId: string;
  question: string;
  primaryType: string;
  difficulty: string;
  round?: string;
};

const allowedQuestionCounts = [3, 5, 8] as const;


function shuffleQuestions<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createSessionQuestions(questions: InterviewQuestion[], count: number): InterviewQuestion[] {
  return shuffleQuestions(questions).slice(0, Math.min(count, questions.length));
}
function getQuestionSearchText(question: InterviewQuestion): string {
  return [
    question.question,
    question.category,
    question.scoringRubric,
    ...(question.expectedPoints ?? []),
    ...(question.round ?? []),
  ]
    .filter((item) => Boolean(item))
    .join(" ")
    .toLowerCase();
}

function matchQuestionByKeywords(question: InterviewQuestion, keywords: readonly string[]): boolean {
  if (keywords.length === 0) return false;
  const text = getQuestionSearchText(question);
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function sortQuestionsByPriority(questions: InterviewQuestion[], keywords: readonly string[]): InterviewQuestion[] {
  const scored = questions.map((q) => {
    const hit = matchQuestionByKeywords(q, keywords);
    return { q, score: (q.expectedPoints?.length ? 2 : 0) + (hit ? 3 : 0) + (q.difficulty === "medium" ? 1 : 0) };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .map((item) => item.q)
    .filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx);
}

function pickQuestionsByPriority(
  bankQuestions: InterviewQuestion[],
  count: number,
  selectedMode: InterviewModeOption,
  isPrivateInterview: boolean,
): { bankCount: number; matchedCount: number; selectedQuestions: InterviewQuestion[] } {
  if (bankQuestions.length === 0) {
    return { bankCount: 0, matchedCount: 0, selectedQuestions: [] };
  }

  const maxCount = Math.min(count, bankQuestions.length);

  if (!isPrivateInterview) {
    if (isPrivateRoundOption(selectedMode) || selectedMode.value === "structured-mixed") {
      return {
        bankCount: bankQuestions.length,
        matchedCount: bankQuestions.length,
        selectedQuestions: createSessionQuestions(bankQuestions, maxCount),
      };
    }

    const prioritized = sortQuestionsByPriority(bankQuestions, selectedMode.keywords);
    const matched = bankQuestions.filter((q) => matchQuestionByKeywords(q, selectedMode.keywords));
    return {
      bankCount: bankQuestions.length,
      matchedCount: matched.length,
      selectedQuestions: prioritized.slice(0, maxCount),
    };
  }

  const privateMode = isPrivateRoundOption(selectedMode) ? selectedMode : defaultPrivateRoundOption;
  const roundMatched = bankQuestions.filter((q) => q.round.includes(privateMode.round) || matchQuestionByKeywords(q, privateMode.keywords));
  const roundMatchedIds = new Set(roundMatched.map((q) => q.id));
  const rest = bankQuestions.filter((q) => !roundMatchedIds.has(q.id));
  const ordered = [...shuffleQuestions(roundMatched), ...shuffleQuestions(rest)];

  return {
    bankCount: bankQuestions.length,
    matchedCount: roundMatched.length,
    selectedQuestions: ordered.slice(0, maxCount),
  };
}

function mapRoundToInterviewRound(round?: string): InterviewRound {
  switch (round) {
    case "hr":
      return "HR";
    case "business":
      return "业务";
    case "manager":
      return "主管";
    case "final":
      return "终面";
    case "stress":
      return "压力";
    case "english":
      return "英文";
    default:
      return "综合";
  }
}

function mapStructuredToInterviewQuestion(items: StructuredQuestion[]): InterviewQuestion[] {
  return items.map((item) => ({
    id: item.id,
    question: item.question,
    category: item.primaryType,
    difficulty: item.difficulty === "easy" || item.difficulty === "hard" ? item.difficulty : "medium",
    expectedPoints: ["观点清晰", "逻辑完整", "结合岗位场景"],
    scoringRubric: "重点考察答题结构、案例支撑和岗位匹配度。",
    round: [mapRoundToInterviewRound(item.round)],
  }));
}

function normalizeStructuredBankId(input?: string | null): StructuredBankId {
  switch (input) {
    case "national-civil-service":
    case "national":
    case "civil-service":
    case "公务员":
    case "公务员 / 选调结构化面试":
      return "national-civil-service";
    case "provincial-civil-service":
    case "provincial":
    case "省考":
      return "provincial-civil-service";
    case "public-institution":
    case "institution":
    case "事业编":
    case "事业单位":
      return "public-institution";
    case "state-owned-enterprise":
    case "state-owned":
    case "bank":
    case "国企":
    case "央企":
    case "银行":
    case "国企 / 银行结构化面试":
      return "state-owned-enterprise";
    case "private-company":
    case "private":
    case "company":
    case "私企":
    case "民企":
      return "private-company";
    default:
      return "national-civil-service";
  }
}

function InterviewPageContent() {
  const searchParams = useSearchParams();
  const queryBankId = searchParams.get("bank") ?? searchParams.get("bankId");
  const queryCount = searchParams.get("count");
  const parsedQueryCount = Number(queryCount);
  const initialQuestionCount = allowedQuestionCounts.includes(parsedQueryCount as (typeof allowedQuestionCounts)[number]) ? parsedQueryCount : 5;
  const initialBankId = queryBankId || interviewBanks[0]?.id || "national-civil-service";

  const [bankId, setBankId] = useState(initialBankId);
  const [round, setRound] = useState<InterviewRound>("综合");
  const [roundFilter, setRoundFilter] = useState<RoundFilter>("hr");
  const [activeModeKey, setActiveModeKey] = useState<InterviewModeKey>("structured-mixed");
  const [questionCount, setQuestionCount] = useState(initialQuestionCount);
  const [sessionQuestions, setSessionQuestions] = useState<InterviewQuestion[]>([]);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUpCount, setFollowUpCount] = useState(0);
  const [pendingEvaluation, setPendingEvaluation] = useState<{ score: number; feedback: string } | null>(null);
  const [interviewStatus, setInterviewStatus] = useState<InterviewStatus>("idle");
  const [report, setReport] = useState<ReportItem[]>([]);
  const [tip, setTip] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<InterviewQuestion[]>([]);
  const [lastRecordedBlob, setLastRecordedBlob] = useState<Blob | null>(null);
  const [lastRecordedUrl, setLastRecordedUrl] = useState("");
  const [audioDiagnostics, setAudioDiagnostics] = useState<AudioDiagnostics | null>(null);
  const [recorderStatus, setRecorderStatus] = useState<RecorderStatus>("未启动");
  const [micPermissionStatus, setMicPermissionStatus] = useState<MicPermissionStatus>("未知");
  const [recorderErrorName, setRecorderErrorName] = useState("");
  const [recorderErrorMessage, setRecorderErrorMessage] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<RecorderCoreInstance | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTargetRef = useRef<InterviewTarget>("main");
  const zeroGainNodeRef = useRef<GainNode | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const isRecordingRef = useRef(false);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const xfyunSocketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const uploadedForTranscriptionRef = useRef(false);
  const recordingStartedAtRef = useRef<number | null>(null);
  const segmentCacheRef = useRef<Record<string, string>>({});

  const appendTranscript = (target: InterviewTarget, deltaText: string) => {
    const text = deltaText.trim();
    if (!text) return;
    if (target === "main") {
      setAnswer((prev) => `${prev}${prev ? "\n" : ""}${text}`);
    } else {
      setFollowUpAnswer((prev) => `${prev}${prev ? "\n" : ""}${text}`);
    }
  };

  useEffect(() => {
    if (queryBankId) setBankId(queryBankId);
  }, [queryBankId]);

  useEffect(() => {
    const nextCount = Number(searchParams.get("count"));
    if (allowedQuestionCounts.includes(nextCount as (typeof allowedQuestionCounts)[number])) {
      setQuestionCount(nextCount);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (lastRecordedUrl) {
        URL.revokeObjectURL(lastRecordedUrl);
      }
    };
  }, [lastRecordedUrl]);

  const normalizedBankId = useMemo(() => normalizeStructuredBankId(bankId), [bankId]);
  const currentBank = useMemo(() => interviewBanks.find((x) => x.id === normalizedBankId) ?? interviewBanks[0], [normalizedBankId]);
  const interviewUiKind = useMemo(() => getInterviewUiKind(bankId, currentBank?.name), [bankId, currentBank?.name]);
  const isPrivateInterview = interviewUiKind === "private-company";
  const isPublicMode = !isPrivateInterview;
  const activeModeOptions = isPrivateInterview ? privateRoundOptions : publicModeOptions;
  const modeSectionTitle = isPrivateInterview ? "面试轮次" : "面试模式";
  const modeSectionDescription = isPrivateInterview
    ? "选择你想模拟的面试轮次，系统会优先抽取对应问题。"
    : "选择结构化面试模式，系统会在当前题库内按模式优先抽题。";
  const questions = useMemo(() => (currentBank?.questions ?? []), [currentBank]);
  const selectedMode = useMemo<InterviewModeOption>(() => {
    const found = activeModeOptions.find((item) => item.value === activeModeKey);
    if (found) return found;
    return isPrivateInterview ? defaultPrivateRoundOption : defaultPublicModeOption;
  }, [activeModeOptions, activeModeKey, isPrivateInterview]);

  const modeMetaText = isPrivateInterview && isPrivateRoundOption(selectedMode)
    ? `轮次：${selectedMode.roundLabel}`
    : `模式：${selectedMode.label}`;
  const activeQuestions = started ? sessionQuestions : questions;
  const currentQuestion = activeQuestions[index];
  const currentTarget: InterviewTarget = interviewStatus === "followup_asking" || interviewStatus === "followup_listening" ? "followup" : "main";
  const isFollowupStage = currentTarget === "followup";
  const currentPrompt = isFollowupStage ? followUpQuestion : currentQuestion?.question ?? "";
  const isLastQuestion = index >= activeQuestions.length - 1;
  const currentBankQuestions = bankQuestions.length > 0 ? bankQuestions : questions;

  useEffect(() => {
    let active = true;
    const fetchStructuredQuestions = async (targetBankId: StructuredBankId) => {
      try {
        const params = new URLSearchParams({ bankId: targetBankId, examType: targetBankId, pageSize: "1000" });
        const res = await fetch(`/api/question-pool?${params.toString()}`);
        const data = (await res.json()) as { questions?: StructuredQuestion[] };
        if (!active) return;
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          const mapped = mapStructuredToInterviewQuestion(data.questions).filter((item) => Boolean(item.question));
          setBankQuestions(mapped);
          return;
        }
      } catch {
        // ignore and fallback below
      }
      if (!active) return;
      setBankQuestions(questions.filter((item) => Boolean(item.question)));
    };

    fetchStructuredQuestions(normalizedBankId);
    return () => {
      active = false;
    };
  }, [normalizedBankId, questions]);

  const questionPoolMeta = useMemo(() => {
    const bankQuestions = currentBankQuestions;
    if (bankQuestions.length === 0) {
      return { bankCount: 0, matchedCount: 0 };
    }

    if (!isPrivateInterview) {
      if (isPrivateRoundOption(selectedMode) || selectedMode.value === "structured-mixed") {
        return {
          bankCount: bankQuestions.length,
          matchedCount: bankQuestions.length,
        };
      }
      const matched = bankQuestions.filter((q) => matchQuestionByKeywords(q, selectedMode.keywords));
      return {
        bankCount: bankQuestions.length,
        matchedCount: matched.length,
      };
    }

    const privateMode = isPrivateRoundOption(selectedMode) ? selectedMode : defaultPrivateRoundOption;
    const roundMatched = bankQuestions.filter((q) => q.round.includes(privateMode.round) || matchQuestionByKeywords(q, privateMode.keywords));
    return {
      bankCount: bankQuestions.length,
      matchedCount: roundMatched.length,
    };
  }, [currentBankQuestions, isPrivateInterview, selectedMode]);

  useEffect(() => {
    if (isPrivateInterview) {
      setActiveModeKey("hr");
      setRound("HR");
      setRoundFilter("hr");
      return;
    }
    setActiveModeKey("structured-mixed");
    setRound("综合");
    setRoundFilter("");
  }, [isPrivateInterview, bankId]);

  const statusText = useMemo(() => {
    switch (interviewStatus) {
      case "asking":
        return "面试官提问中";
      case "listening":
        return "正在听你回答";
      case "analyzing":
        return "AI 分析中";
      case "followup_asking":
        return "追问中";
      case "followup_listening":
        return "请回答追问，我正在听...";
      case "completed":
        return "本题完成";
      default:
        return "待开始";
    }
  }, [interviewStatus]);

  const currentStatusHint = useMemo(() => {
    switch (interviewStatus) {
      case "asking":
        return "面试官正在提问...";
      case "listening":
        return "请开始回答，我正在听...";
      case "analyzing":
        return "AI 正在分析你的回答...";
      case "followup_asking":
        return "面试官正在追问...";
      case "followup_listening":
        return "请回答追问，我正在听...";
      case "completed":
        return isLastQuestion ? "本题已完成，点击生成面试报告。" : "本题已完成，点击下一题继续。";
      default:
        return "点击开始模拟面试后，系统会自动提问并开始听你回答。";
    }
  }, [interviewStatus, isLastQuestion]);

  const stopAudioRecording = () => {
    const recorder = recorderRef.current;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingSeconds(0);
    if (recorder) {
      recorder.close();
    }
    recorderRef.current = null;
    isRecordingRef.current = false;
    xfyunSocketRef.current?.close();
    xfyunSocketRef.current = null;
    processorRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    audioContextRef.current?.close().catch(() => null);
    processorRef.current = null;
    sourceNodeRef.current = null;
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecorderStatus("未启动");
  };

  const clearRecordingArtifacts = () => {
    stopAudioRecording();
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current = null;
    }
    recordedChunksRef.current = [];
    uploadedForTranscriptionRef.current = false;
    recordingStartedAtRef.current = Date.now();
    if (lastRecordedUrl) {
      URL.revokeObjectURL(lastRecordedUrl);
    }
    setLastRecordedBlob(null);
    setLastRecordedUrl("");
    setAudioDiagnostics(null);
    setTip("");
    setRecorderErrorName("");
    setRecorderErrorMessage("");
  };

  const detectMicPermission = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicPermissionStatus("未知");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionStatus("已授权");
      stream.getTracks().forEach((track) => track.stop());
      console.log("mic open success");
    } catch (error) {
      setMicPermissionStatus("未授权");
      const name = error instanceof DOMException ? error.name : "UnknownError";
      const message = error instanceof Error ? error.message : "unknown microphone permission error";
      setRecorderErrorName(name);
      setRecorderErrorMessage(message);
      console.error("microphone or recorder failed:", error);
    }
  };

  const stopCamera = () => {
    const stream = cameraStreamRef.current;
    stream?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraReady(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const speak = (text: string, onEnd?: () => void) => {
    if (!text) {
      onEnd?.();
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setTip("当前浏览器不支持语音朗读，你可以直接手动输入回答。");
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentBank?.id === "english" ? "en-US" : "zh-CN";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => {
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  const transcribeAudioBlob = async (audioBlob: Blob, target: InterviewTarget) => {
    const file = new File([audioBlob], `interview-answer-${Date.now()}.wav`, { type: "audio/wav" });
    const formData = new FormData();
    formData.append("audio", file);
    const response = await fetch("/api/interview/transcribe", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as { text?: string; error?: string; status?: number; detail?: string };
    if (!response.ok) {
      if (data.error === "Silent audio") {
        throw new Error("录音文件接近静音，请确认浏览器已允许麦克风，并点击“试听录音”检查是否能听到声音。");
      }
      if (data.error === "Invalid WAV audio") {
        throw new Error("当前录音格式不是标准 WAV，请刷新页面后重试。");
      }
      if (data.error === "Tencent ASR returned empty transcript") {
        throw new Error("腾讯云未识别到有效语音，请先点击“试听录音”确认录音是否有声音。");
      }
      const lines = [
        `转写失败：${data.error ?? "Unknown error"}`,
        data.status !== undefined ? `状态码：${data.status}` : "",
        data.detail ? `详情：${data.detail}` : "",
      ].filter((line) => Boolean(line));
      throw new Error(lines.join("\n"));
    }
    const transcript = (data.text ?? "").trim();
    if (!transcript) {
      throw new Error("未识别到语音内容，请重试或手动输入。");
    }
    if (target === "main") {
      setAnswer(transcript);
    } else {
      setFollowUpAnswer(transcript);
    }
    setTip("语音转写成功，你可以继续补充或直接提交。");
  };

  const exportChunk = async (): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    if (!recorder) return null;
    return new Promise<Blob | null>((resolve) => {
      recorder.stop(
        (blob) => {
          resolve(blob.size > 0 ? blob : null);
        },
        () => resolve(null),
      );
    });
  };

  const startAutoListening = async (target: InterviewTarget) => {
    console.log("startRecording called");
    console.log("isRecording before start:", isRecordingRef.current);
    console.log("recorder exists:", Boolean(recorderRef.current));
    if (isRecordingRef.current) {
      return;
    }
    const status = target === "main" ? "listening" : "followup_listening";
    setInterviewStatus(status);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setTip("当前浏览器不支持麦克风录音，请手动输入回答。");
      return;
    }

    clearRecordingArtifacts();
    setRecorderStatus("启动中");

    try {
      const recorder = createRecorder({
        type: "wav",
        sampleRate: 16000,
        bitRate: 16,
        numChannels: 1,
        onProcess: () => {},
      });
      await new Promise<void>((resolve, reject) => {
        recorder.open(
          () => resolve(),
          (message, isUserNotAllow) => {
            const error = new Error(message || "录音器启动失败");
            error.name = isUserNotAllow ? "NotAllowedError" : "RecorderOpenError";
            reject(error);
          },
        );
      });
      console.log("mic open success");
      recorder.start();
      console.log("recorder start success");
      const authRes = await fetch("/api/interview/xfyun-auth");
      const authData = (await authRes.json()) as { wsUrl?: string; appId?: string; error?: string; detail?: string };
      if (!authRes.ok || !authData.wsUrl || !authData.appId) {
        throw new Error(authData.detail ?? authData.error ?? "讯飞鉴权失败");
      }
      segmentCacheRef.current = {};
      const socket = new WebSocket(authData.wsUrl);
      xfyunSocketRef.current = socket;
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data) as { code?: number; data?: { result?: { ws?: Array<{ cw?: Array<{ w?: string }>; bg?: number; rg?: number[]; pg?: string }> } }; message?: string };
        if (data.code && data.code !== 0) {
          setTip(`讯飞识别异常：${data.message ?? "unknown error"}`);
          return;
        }
        const words = data.data?.result?.ws ?? [];
        const text = words.map((x) => x.cw?.[0]?.w ?? "").join("").trim();
        if (!text) return;
        const key = `${words[0]?.bg ?? 0}-${words[words.length - 1]?.rg?.[1] ?? 0}`;
        if (segmentCacheRef.current[key] === text) return;
        segmentCacheRef.current[key] = text;
        appendTranscript(target, text);
      };
      socket.onopen = () => {
        socket.send(JSON.stringify({ common: { app_id: authData.appId }, business: { language: "zh_cn", domain: "iat", accent: "mandarin", dwa: "wpgs" }, data: { status: 0, format: "audio/L16;rate=16000", encoding: "raw", audio: "" } }));
      };
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      const stream = recorder as unknown as { stream?: MediaStream };
      if (!stream.stream) {
        throw new Error("录音器未返回可用音频流");
      }
      streamRef.current = stream.stream;
      const sourceNode = audioContext.createMediaStreamSource(stream.stream);
      sourceNodeRef.current = sourceNode;
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (!xfyunSocketRef.current || xfyunSocketRef.current.readyState !== WebSocket.OPEN) return;
        const channelData = e.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i += 1) {
          const s = Math.max(-1, Math.min(1, channelData[i]));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(pcm.buffer)));
        xfyunSocketRef.current.send(JSON.stringify({ data: { status: 1, format: "audio/L16;rate=16000", encoding: "raw", audio: audioBase64 } }));
      };
      sourceNode.connect(processor);
      processor.connect(audioContext.destination);
      recorderRef.current = recorder;
      recordingTargetRef.current = target;
      isRecordingRef.current = true;
      setRecorderStatus("录音中");
      setMicPermissionStatus("已授权");
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((prev) => prev + 1), 1000);
      setTip("正在录音并实时转写，请点击“停止录音并转写”结束。");
    } catch (error) {
      isRecordingRef.current = false;
      setRecorderStatus("失败");
      const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : "UnknownError";
      const message = error instanceof Error ? error.message : "录音器启动失败";
      setRecorderErrorName(name);
      setRecorderErrorMessage(message);
      if (name === "NotAllowedError") {
        setMicPermissionStatus("未授权");
        setTip("浏览器未授权麦克风。");
      } else {
        setTip(`录音器启动失败：${message}`);
      }
      console.error("microphone or recorder failed:", error);
    }
  };

  const stopRecordingAndTranscribe = async () => {
    const recorder = recorderRef.current;
    if (!recorder || !isRecordingRef.current) {
      setTip("没有正在进行的录音，请重新开始。");
      return;
    }
    setRecorderStatus("停止中");
    const audioBlob = await exportChunk();
    stopAudioRecording();

    if (!audioBlob || audioBlob.size === 0) {
      setTip("没有录到有效音频，请重试或手动输入。");
      return;
    }

    const durationSeconds = recordingStartedAtRef.current ? Math.max(0, (Date.now() - recordingStartedAtRef.current) / 1000) : 0;
    recordingStartedAtRef.current = null;
    uploadedForTranscriptionRef.current = false;
    setAudioDiagnostics({ durationSeconds, chunkCount: 1, chunkSizes: [audioBlob.size], mimeType: "audio/wav", uploadedForTranscription: false });
    if (lastRecordedUrl) {
      URL.revokeObjectURL(lastRecordedUrl);
    }
    setLastRecordedBlob(audioBlob);
    setLastRecordedUrl(URL.createObjectURL(audioBlob));

    try {
      const socket = xfyunSocketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ data: { status: 2, format: "audio/L16;rate=16000", encoding: "raw", audio: "" } }));
      }
      setTip("录音已停止，实时转写结果已追加到文本框，可手动修改后提交。");
      uploadedForTranscriptionRef.current = true;
      setAudioDiagnostics((prev) => (prev ? { ...prev, uploadedForTranscription: true } : prev));
      setRecorderStatus("未启动");
    } catch (error) {
      const message = error instanceof Error ? error.message : "转写结束异常，请手动输入回答。";
      setTip(message);
      setRecorderStatus("失败");
    }
  };

  const openCamera = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setTip("当前浏览器不支持摄像头预览，你仍然可以继续面试。");
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => null);
      }
      setCameraReady(true);
    } catch {
      setTip("摄像头无法使用，你仍然可以继续面试。");
      setCameraReady(false);
    }
  };

  const startQuestionFlow = (target: InterviewTarget, text: string) => {
    if (!text) return;
    setTip("");
    setInterviewStatus(target === "main" ? "asking" : "followup_asking");
    speak(text, () => {
      startAutoListening(target);
    });
  };

  const submitMainAnswer = async () => {
    const submittedAnswer = answer.trim();
    if (!currentQuestion || !submittedAnswer) {
      setTip("请先输入或识别到回答内容后再提交。");
      return;
    }

    stopAudioRecording();
    setInterviewStatus("analyzing");
    setTip("AI 正在分析你的回答...");

    let result: EvaluationResponse = {
      score: 5,
      followUpNeeded: false,
      followUpQuestion: "",
      shortFeedback: "回答具备基础结构，建议补充更具体的行动与结果。",
    };

    try {
      const res = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion.question,
          answer: submittedAnswer,
          expectedPoints: currentQuestion.expectedPoints,
          scoringRubric: currentQuestion.scoringRubric,
          followUpCount,
        }),
      });
      const data = (await res.json()) as EvaluationResponse;
      if (typeof data.score === "number") {
        result = {
          score: data.score,
          followUpNeeded: Boolean(data.followUpNeeded),
          followUpQuestion: data.followUpQuestion ?? "",
          shortFeedback: data.shortFeedback ?? result.shortFeedback,
        };
      }
    } catch {
      setTip("当前无法连接 AI 评估，已使用本地兜底分析。你仍然可以继续面试。");
    }

    if (result.followUpNeeded && result.followUpQuestion) {
      setPendingEvaluation({ score: result.score, feedback: result.shortFeedback });
      setFollowUpQuestion(result.followUpQuestion);
      setFollowUpAnswer("");
      setFollowUpCount(1);
      startQuestionFlow("followup", result.followUpQuestion);
      return;
    }

    setReport((prev) => [
      ...prev,
      {
        question: currentQuestion.question,
        answer: submittedAnswer,
        score: result.score,
        feedback: result.shortFeedback,
      },
    ]);
    setPendingEvaluation(null);
    setFollowUpQuestion("");
    setFollowUpCount(0);
    setInterviewStatus("completed");
    setTip("本题已完成，点击下一题继续。");
  };

  const submitFollowUpAnswer = () => {
    const submittedFollowUpAnswer = followUpAnswer.trim();
    if (!currentQuestion || !submittedFollowUpAnswer) {
      setTip("请先输入或识别到追问回答内容后再提交。");
      return;
    }

    stopAudioRecording();
    setInterviewStatus("analyzing");
    setTip("AI 正在分析你的追问回答...");

    const evaluation = pendingEvaluation ?? { score: 5, feedback: "回答具备基础结构，建议补充更具体的行动与结果。" };
    const combinedAnswer = [answer.trim(), `追问回答：${submittedFollowUpAnswer}`].filter(Boolean).join("\n\n");

    setReport((prev) => [
      ...prev,
      {
        question: currentQuestion.question,
        answer: combinedAnswer,
        followUpAnswer: submittedFollowUpAnswer,
        score: evaluation.score,
        feedback: evaluation.feedback,
      },
    ]);
    setPendingEvaluation(null);
    setFollowUpQuestion("");
    setFollowUpCount(0);
    setInterviewStatus("completed");
    setTip("本题已完成，点击下一题继续。");
  };

  const handleStartInterview = async () => {
    const safeQuestionSource = currentBankQuestions.filter((item) => Boolean(item.question));
    const sourceToUse = safeQuestionSource.length > 0 ? safeQuestionSource : currentBankQuestions;
    const { selectedQuestions } = pickQuestionsByPriority(
      sourceToUse,
      questionCount,
      selectedMode,
      isPrivateInterview,
    );
    if (!selectedQuestions.length && currentBankQuestions.length > 0) {
      setTip("当前筛选条件未抽到题目，已自动放宽条件，请重试。");
      return;
    }
    if (!selectedQuestions.length) {
      setTip("当前题库暂无可用题目，请返回题库检查数据。");
      return;
    }

    stopAudioRecording();
    stopCamera();
    setSessionQuestions(selectedQuestions);
    setStarted(true);
    setIndex(0);
    setAnswer("");
    setFollowUpAnswer("");
    setFollowUpQuestion("");
    setFollowUpCount(0);
    setPendingEvaluation(null);
    setReport([]);
    setInterviewStatus("idle");
    setTip("");

    await openCamera();
    startQuestionFlow("main", selectedQuestions[0].question);
  };

  const handleNextQuestion = () => {
    if (index >= sessionQuestions.length - 1) {
      setTip("面试报告已生成。");
      setInterviewStatus("completed");
      return;
    }
    const nextIndex = index + 1;
    const nextQuestion = sessionQuestions[nextIndex];

    if (!nextQuestion) {
      setTip("面试报告已生成。");
      setInterviewStatus("completed");
      return;
    }

    stopAudioRecording();
    setIndex(nextIndex);
    setAnswer("");
    setFollowUpAnswer("");
    setFollowUpQuestion("");
    setFollowUpCount(0);
    setPendingEvaluation(null);
    startQuestionFlow("main", nextQuestion.question);
  };

  const handleReplayPrompt = () => {
    if (!currentPrompt) return;
    stopAudioRecording();
    startQuestionFlow(currentTarget, currentPrompt);
  };

  const handleGenerateReport = () => {
    setTip("面试报告已生成。");
  };

  const activeAnswer = isFollowupStage ? followUpAnswer : answer;
  const setActiveAnswer = isFollowupStage ? setFollowUpAnswer : setAnswer;
  const textareaTitle = isFollowupStage ? "追问回答转写 / 手动补充" : "回答转写 / 手动补充";
  const textareaPlaceholder =
    "系统会自动识别你的回答，你也可以在这里手动修改或补充。";
  const textareaHint = "如果语音识别不准确，可以直接编辑文字后再提交。";
  const mainButtonLabel = !started
    ? "开始模拟面试"
    : interviewStatus === "followup_listening"
      ? "停止录音并转写"
      : interviewStatus === "listening"
        ? "停止录音并转写"
        : isLastQuestion && interviewStatus === "completed"
          ? "生成面试报告"
          : "下一题";

  const avgScore = report.length ? (report.reduce((acc, item) => acc + item.score, 0) / report.length).toFixed(1) : "0.0";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 p-6 text-white">
      <AnimatedBackground />
      <FloatingOrbs />

      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">AI 面试官正在与你模拟面试</h1>
          <label className="mt-5 block text-sm text-slate-300">面试类型</label>
          <SmartSelect
            className="mt-2"
            value={bankId}
            onChange={setBankId}
            disabled={started}
            options={interviewBanks.map((bank) => ({ value: bank.id, label: bank.name }))}
            placeholder="选择面试类型"
            searchable
          />
          <div className="mt-4">
            <p className="text-sm text-slate-300">{modeSectionTitle}</p>
            <p className="mt-1 text-xs text-slate-400">{modeSectionDescription}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {activeModeOptions.map((option) => {
                const active = activeModeKey === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setActiveModeKey(option.value);
                      if (isPrivateInterview && isPrivateRoundOption(option)) {
                        setRoundFilter(option.value);
                        setRound(option.round);
                      } else {
                        setRoundFilter("");
                        setRound("综合");
                      }
                    }}
                    disabled={started}
                    className={`relative rounded-2xl border px-3 py-3 text-left transition duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? "border-cyan-300/60 bg-gradient-to-r from-cyan-400/20 via-blue-500/20 to-purple-500/20 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_16px_40px_rgba(59,130,246,0.16)] ring-1 ring-cyan-300/30"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/30 hover:bg-white/10"
                    }`}
                  >
                    {active ? (
                      <span className="absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-cyan-300 text-[10px] font-semibold text-slate-950">
                        ✓
                      </span>
                    ) : null}
                    <p className="font-semibold">{option.label}</p>
                    <p className="mt-1 text-xs text-slate-400">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <label className="mt-4 block text-sm text-slate-300">模拟强度{isPublicMode ? "（含真题套卷模式在后续迭代开放）" : ""}</label>
          <div className="mt-2">
            <InterviewIntensitySelector value={questionCount} disabled={started} onChange={setQuestionCount} />
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
            <p className="font-medium text-white">题库预览</p>
            <p className="mt-1 text-slate-400">开始面试后，将从当前筛选结果中随机抽取题目。</p>
            <p className="mt-2">当前题库总题数：{questionPoolMeta.bankCount} 题</p>
            <p>模式优先匹配：{questionPoolMeta.matchedCount} 题</p>
            <p>本场计划抽取：{questionCount} 题</p>
            <p>实际抽取：{Math.min(questionCount, questionPoolMeta.bankCount)} 题</p>
          </div>
          {!started ? (
            <div className="mt-5">
              <button
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-cyan-500/20 transition duration-300 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleStartInterview}
                disabled={bankQuestions.length === 0}
              >
                开始模拟面试
              </button>
              <p className="mt-2 text-xs text-slate-400">开始后将自动抽题、自动提问，并进入真实模拟面试流程</p>
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">面试进行中，右侧会自动朗读题目并开始听你回答。</p>
          )}
        </GlassCard>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur lg:col-span-2">
          <h2 className="text-xl font-bold tracking-tight text-white">{statusText}</h2>
          <p className="mt-2 text-sm text-slate-300">{currentStatusHint}</p>
          <p className="mt-1 text-sm text-slate-400">摄像头仅本地显示，不上传给 AI，不保存音频。</p>

          <div className="mt-3 overflow-hidden rounded-3xl border border-white/10 bg-black/70">
            <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full" />
            {!cameraReady ? (
              <div className="grid aspect-video place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_70%_70%,rgba(168,85,247,0.2),transparent_40%)] px-6 text-center text-slate-300">
                点击开始模拟面试后，将开启摄像头预览
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-3 py-1 text-cyan-200">状态：{statusText}</span>
              <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-3 py-1 text-cyan-200">题号：{Math.min(index + 1, activeQuestions.length || 1)}</span>
              <span className="rounded-full border border-blue-300/30 bg-blue-400/15 px-3 py-1 text-blue-200">题库：{currentBank?.name}</span>
              <span className="rounded-full border border-purple-300/30 bg-purple-400/15 px-3 py-1 text-purple-200">{modeMetaText}</span>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-emerald-200">难度：{currentQuestion?.difficulty ?? "普通"}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">当前题目</p>
            <p className="mt-1 text-lg text-white md:text-xl">{currentPrompt || currentQuestion?.question || (currentBankQuestions.length > 0 ? "点击开始模拟面试后，将从当前题库抽取题目。" : "当前题库暂无可用题目，请返回题库检查数据。")}</p>
            {currentQuestion?.category ? <p className="mt-2 text-sm text-slate-400">题目类型：{currentQuestion.category}</p> : null}
            {started && sessionQuestions.length === 0 && currentBankQuestions.length > 0 ? (
              <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-200">
                <p>当前筛选条件未抽到题目，已自动放宽条件，请重试。</p>
                <button
                  type="button"
                  className="mt-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-100 hover:bg-amber-300/20"
                  onClick={handleStartInterview}
                >
                  重新抽题
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {started && interviewStatus !== "idle" ? (
              <button
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                onClick={handleReplayPrompt}
              >
                重新听一遍
              </button>
            ) : null}

            {started && interviewStatus === "completed" ? (
              <button
                className="rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-4 py-2 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110"
                onClick={isLastQuestion ? handleGenerateReport : handleNextQuestion}
              >
                {mainButtonLabel}
              </button>
            ) : interviewStatus === "listening" ? (
              <button
                className="rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-4 py-2 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={stopRecordingAndTranscribe}
                disabled={!currentQuestion}
              >
                {mainButtonLabel}
              </button>
            ) : interviewStatus === "followup_listening" ? (
              <button
                className="rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-4 py-2 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={stopRecordingAndTranscribe}
                disabled={!currentQuestion}
              >
                {mainButtonLabel}
              </button>
            ) : null}
          </div>
          {started && (interviewStatus === "listening" || interviewStatus === "followup_listening") ? (
            <p className="mt-2 text-xs text-slate-400">请靠近麦克风，用普通话清晰作答。录音结束后系统会自动转写，转写文字可手动修改后再提交。</p>
          ) : null}
          <button
            type="button"
            className="mt-3 mr-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
            onClick={() => {
              void detectMicPermission();
            }}
          >
            测试麦克风
          </button>
          {lastRecordedBlob ? (
            <button
              type="button"
              className="mt-3 rounded-xl border border-cyan-300/50 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/20"
              onClick={() => {
                if (!lastRecordedUrl) return;
                if (previewAudioRef.current) {
                  previewAudioRef.current.pause();
                  previewAudioRef.current.currentTime = 0;
                }
                const audio = new Audio(lastRecordedUrl);
                previewAudioRef.current = audio;
                void audio.play();
              }}
            >
              试听录音
            </button>
          ) : null}
          {isRecordingRef.current ? <p className="mt-2 text-xs text-cyan-200">录音计时：{recordingSeconds} 秒</p> : null}
          {audioDiagnostics ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-cyan-100/90 whitespace-pre-line">
              {`录音时长：${audioDiagnostics.durationSeconds.toFixed(2)} 秒
分片数量：${audioDiagnostics.chunkCount}
每段音频大小：${audioDiagnostics.chunkSizes.map((size) => `${(size / 1024).toFixed(2)} KB`).join(" / ")}
音频格式：${audioDiagnostics.mimeType}
采样率：16000
声道：1
编码：PCM16
是否已上传转写：${audioDiagnostics.uploadedForTranscription ? "是" : "否"}`}
            </div>
          ) : null}
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200 whitespace-pre-line">
            {`麦克风权限状态：${micPermissionStatus}
录音器状态：${recorderStatus}
错误名称：${recorderErrorName || "-"}
错误详情：${recorderErrorMessage || "-"}`}
          </div>
          {tip ? <p className="mt-2 text-sm text-amber-300">{tip}</p> : null}

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-200">{textareaTitle}</label>
            <p className="mt-1 text-xs text-slate-400">{textareaHint}</p>
            <textarea
              className="mt-3 min-h-32 w-full rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
              placeholder={textareaPlaceholder}
              value={activeAnswer}
              onChange={(e) => setActiveAnswer(e.target.value)}
            />
            {started && (interviewStatus === "listening" || interviewStatus === "followup_listening") ? (
              <button
                type="button"
                className="mt-3 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={isFollowupStage ? submitFollowUpAnswer : submitMainAnswer}
                disabled={!currentQuestion || !activeAnswer.trim()}
              >
                提交当前回答
              </button>
            ) : null}
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
            <h3 className="text-xl font-bold tracking-tight text-white">最终面试报告</h3>
            <div className="mt-3 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-4">
              <p className="text-sm text-slate-300">综合得分</p>
              <p className="text-3xl font-bold text-white">{avgScore} / 10</p>
              <p className="text-sm text-slate-400">已完成：{report.length} / {sessionQuestions.length || activeQuestions.length} 题</p>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {report.map((item, i) => (
                <li key={`${item.question}-${i}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="font-medium text-white">
                    Q{i + 1}: {item.question}
                  </p>
                  <p className="mt-1 text-slate-300">得分：{item.score}</p>
                  {item.followUpAnswer ? <p className="mt-1 text-slate-300">追问回答已记录</p> : null}
                  <p className="mt-1 rounded-xl border border-purple-300/20 bg-purple-400/10 p-2 text-purple-200">建议：{item.feedback}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950 p-6 text-slate-300">加载面试配置中...</main>}>
      <InterviewPageContent />
    </Suspense>
  );
}
