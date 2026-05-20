"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { interviewBanks, type InterviewQuestion, type InterviewRound } from "@/data/question-banks";
import InterviewIntensitySelector from "@/components/InterviewIntensitySelector";

const roundOptions = [
  {
    value: "all",
    label: "综合",
    description: "混合多轮次问题",
    round: "综合",
  },
  {
    value: "hr",
    label: "HR 初面",
    description: "动机、稳定性、表达",
    round: "HR",
  },
  {
    value: "business",
    label: "业务面",
    description: "岗位能力与案例",
    round: "业务",
  },
  {
    value: "manager",
    label: "主管面",
    description: "执行、协作与结果",
    round: "主管",
  },
  {
    value: "final",
    label: "终面",
    description: "长期规划与匹配度",
    round: "终面",
  },
  {
    value: "stress",
    label: "压力面",
    description: "抗压与应变能力",
    round: "压力",
  },
  {
    value: "english",
    label: "英文面试",
    description: "英文表达与沟通",
    round: "英文",
  },
] as const;

type RoundFilter = (typeof roundOptions)[number]["value"];


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
};

type SpeechRecognitionResultLike = { transcript: string };
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
const allowedQuestionCounts = [3, 5, 8] as const;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
}


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

function mapStructuredToInterviewQuestion(items: StructuredQuestion[]): InterviewQuestion[] {
  return items.map((item) => ({
    id: item.id,
    question: item.question,
    category: item.primaryType,
    difficulty: item.difficulty === "easy" || item.difficulty === "hard" ? item.difficulty : "medium",
    expectedPoints: ["观点清晰", "逻辑完整", "结合岗位场景"],
    scoringRubric: "重点考察答题结构、案例支撑和岗位匹配度。",
    round: ["综合"],
  }));
}

function InterviewPageContent() {
  const searchParams = useSearchParams();
  const queryBankId = searchParams.get("bank");
  const queryCount = searchParams.get("count");
  const parsedQueryCount = Number(queryCount);
  const initialQuestionCount = allowedQuestionCounts.includes(parsedQueryCount as (typeof allowedQuestionCounts)[number]) ? parsedQueryCount : 5;
  const initialBankId =
    queryBankId && interviewBanks.some((bank) => bank.id === queryBankId)
      ? queryBankId
      : interviewBanks[0]?.id ?? "";

  const [bankId, setBankId] = useState(initialBankId);
  const [round, setRound] = useState<InterviewRound>("综合");
  const [roundFilter, setRoundFilter] = useState<RoundFilter>("all");
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionStoppingRef = useRef(false);

  useEffect(() => {
    if (queryBankId && interviewBanks.some((bank) => bank.id === queryBankId)) {
      setBankId(queryBankId);
    }
  }, [queryBankId]);

  useEffect(() => {
    const nextCount = Number(searchParams.get("count"));
    if (allowedQuestionCounts.includes(nextCount as (typeof allowedQuestionCounts)[number])) {
      setQuestionCount(nextCount);
    }
  }, [searchParams]);

  const currentBank = useMemo(() => interviewBanks.find((x) => x.id === bankId) ?? interviewBanks[0], [bankId]);
  const questions = useMemo(() => (currentBank?.questions ?? []).filter((q) => q.round.includes(round)), [currentBank, round]);
  const activeQuestions = started ? sessionQuestions : questions;
  const currentQuestion = activeQuestions[index];
  const currentTarget: InterviewTarget = interviewStatus === "followup_asking" || interviewStatus === "followup_listening" ? "followup" : "main";
  const isFollowupStage = currentTarget === "followup";
  const currentPrompt = isFollowupStage ? followUpQuestion : currentQuestion?.question ?? "";
  const isLastQuestion = index >= activeQuestions.length - 1;

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

  const stopRecognition = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      recognitionStoppingRef.current = false;
      return;
    }

    recognitionStoppingRef.current = true;
    try {
      recognition.stop();
    } catch {
      recognitionRef.current = null;
      recognitionStoppingRef.current = false;
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

  const startAutoListening = (target: InterviewTarget) => {
    const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();
    const status = target === "main" ? "listening" : "followup_listening";
    setInterviewStatus(status);

    if (!SpeechRecognitionConstructor) {
      setTip("麦克风无法使用，你可以直接手动输入回答。");
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognitionRef.current = recognition;
    recognitionStoppingRef.current = false;
    recognition.lang = currentBank?.id === "english" ? "en-US" : "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => {
      setTip("");
      setInterviewStatus(status);
    };
    recognition.onend = () => {
      if (recognitionStoppingRef.current) {
        recognitionStoppingRef.current = false;
        recognitionRef.current = null;
        return;
      }
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setInterviewStatus(status);
      setTip("麦克风无法使用，你可以直接手动输入回答。");
    };
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[event.resultIndex]?.[0]?.transcript ?? event.results[0]?.[0]?.transcript ?? "";
      if (!transcript) return;
      if (target === "main") {
        setAnswer(transcript);
      } else {
        setFollowUpAnswer(transcript);
      }
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setTip("麦克风无法使用，你可以直接手动输入回答。");
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

    stopRecognition();
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

    stopRecognition();
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
    let questionSource = questions;
    try {
      const res = await fetch(`/api/question-pool?bankId=${encodeURIComponent(bankId)}`);
      const data = (await res.json()) as { questions?: StructuredQuestion[] };
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        questionSource = mapStructuredToInterviewQuestion(data.questions).filter((q) => q.round.includes(round));
      }
    } catch {
      // ignore and fallback to built-in banks
    }
    const selectedQuestions = createSessionQuestions(questionSource, questionCount);
    if (!selectedQuestions.length) {
      setTip("当前筛选条件下没有可用题目，请更换面试类型或轮次。");
      return;
    }

    stopRecognition();
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

    stopRecognition();
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
    stopRecognition();
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
      ? "回答完了，提交追问"
      : interviewStatus === "listening"
        ? "回答完了，提交"
        : isLastQuestion && interviewStatus === "completed"
          ? "生成面试报告"
          : "下一题";

  const avgScore = report.length ? (report.reduce((acc, item) => acc + item.score, 0) / report.length).toFixed(1) : "0.0";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 p-6 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 left-4 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-6 top-6 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur lg:col-span-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">AI 面试官正在与你模拟面试</h1>
          <label className="mt-5 block text-sm text-slate-300">面试类型</label>
          <select
            className="mt-2 w-full appearance-none rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
            value={bankId}
            onChange={(e) => setBankId(e.target.value)}
            disabled={started}
          >
            {interviewBanks.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.name}
              </option>
            ))}
          </select>
          <div className="mt-4">
            <p className="text-sm text-slate-300">面试轮次</p>
            <p className="mt-1 text-xs text-slate-400">选择你想模拟的面试场景，系统会优先抽取对应轮次的问题。</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {roundOptions.map((option) => {
                const active = roundFilter === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setRoundFilter(option.value);
                      setRound(option.round);
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
          <label className="mt-4 block text-sm text-slate-300">模拟强度</label>
          <div className="mt-2">
            <InterviewIntensitySelector value={questionCount} disabled={started} onChange={setQuestionCount} />
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
            <p className="font-medium text-white">题库预览</p>
            <p className="mt-1 text-slate-400">开始面试后，将从当前筛选结果中随机抽取题目。</p>
            <p className="mt-2">当前筛选题目数：{questions.length} 题</p>
            <p>本场计划抽取：{questionCount} 题</p>
            <p>实际最多抽取：{Math.min(questions.length, questionCount)} 题</p>
          </div>
          {!started ? (
            <div className="mt-5">
              <button
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-cyan-500/20 transition duration-300 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleStartInterview}
                disabled={!questions.length}
              >
                开始模拟面试
              </button>
              <p className="mt-2 text-xs text-slate-400">开始后将自动抽题、自动提问，并进入真实模拟面试流程</p>
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">面试进行中，右侧会自动朗读题目并开始听你回答。</p>
          )}
        </section>

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
              <span className="rounded-full border border-purple-300/30 bg-purple-400/15 px-3 py-1 text-purple-200">轮次：{round}</span>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-emerald-200">难度：{currentQuestion?.difficulty ?? "普通"}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">当前题目</p>
            <p className="mt-1 text-lg text-white md:text-xl">{currentPrompt || currentQuestion?.question || "已完成全部题目"}</p>
            {currentQuestion?.category ? <p className="mt-2 text-sm text-slate-400">题目类型：{currentQuestion.category}</p> : null}
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
                onClick={submitMainAnswer}
                disabled={!currentQuestion}
              >
                {mainButtonLabel}
              </button>
            ) : interviewStatus === "followup_listening" ? (
              <button
                className="rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-4 py-2 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={submitFollowUpAnswer}
                disabled={!currentQuestion}
              >
                {mainButtonLabel}
              </button>
            ) : null}
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
