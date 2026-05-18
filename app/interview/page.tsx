"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { interviewBanks, type InterviewRound } from "@/data/question-banks";

const rounds: InterviewRound[] = ["综合", "HR", "业务", "主管", "终面", "压力", "英文"];

type ReportItem = {
  question: string;
  answer: string;
  score: number;
  feedback: string;
};

type SpeechRecognitionEventLike = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;

  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
}

function InterviewPageContent() {
  const searchParams = useSearchParams();
  const queryBankId = searchParams.get("bank");
  const initialBankId = queryBankId && interviewBanks.some((bank) => bank.id === queryBankId) ? queryBankId : interviewBanks[0]?.id ?? "";

  const [bankId, setBankId] = useState(initialBankId);
  const [round, setRound] = useState<InterviewRound>("综合");
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [followUpCount, setFollowUpCount] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [report, setReport] = useState<ReportItem[]>([]);
  const [tip, setTip] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (queryBankId && interviewBanks.some((bank) => bank.id === queryBankId)) {
      setBankId(queryBankId);
    }
  }, [queryBankId]);

  const currentBank = useMemo(() => interviewBanks.find((x) => x.id === bankId) ?? interviewBanks[0], [bankId]);
  const questions = useMemo(
    () => (currentBank?.questions ?? []).filter((q) => q.round.includes(round)),
    [currentBank, round],
  );
  const currentQuestion = questions[index];

  useEffect(() => {
    const initCamera = async () => {
      if (!started || !videoRef.current || typeof navigator === "undefined") return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      videoRef.current.srcObject = stream;
    };
    initCamera().catch(() => null);
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [started]);

  const speakQuestion = () => {
    if (!currentQuestion || typeof window === "undefined") return;
    const uttr = new SpeechSynthesisUtterance(currentQuestion.question);
    uttr.lang = round === "英文" ? "en-US" : "zh-CN";
    uttr.onstart = () => setSpeaking(true);
    uttr.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(uttr);
  };

  const startRecognition = () => {
    const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();

    if (!SpeechRecognitionConstructor) {
      setTip("当前浏览器不支持语音识别，建议使用 Chrome，或手动输入回答。");
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = round === "英文" ? "en-US" : "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const text = event.results[0]?.[0]?.transcript || "";
      setAnswer((prev) => (prev ? `${prev}\n${text}` : text));
    };
    setTip("");
    recognition.start();
  };

  const submitAnswer = async () => {
    if (!currentQuestion || !answer.trim()) return;
    const res = await fetch("/api/interview/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: currentQuestion.question,
        answer,
        expectedPoints: currentQuestion.expectedPoints,
        scoringRubric: currentQuestion.scoringRubric,
        followUpCount,
      }),
    });
    const result = (await res.json()) as {
      score: number;
      followUpNeeded: boolean;
      followUpQuestion: string;
      shortFeedback: string;
    };

    setReport((prev) => [
      ...prev,
      { question: currentQuestion.question, answer, score: result.score, feedback: result.shortFeedback },
    ]);

    if (result.followUpNeeded && followUpCount < 1) {
      setFollowUpCount(1);
      setAnswer("");
      alert(`追问：${result.followUpQuestion}`);
      return;
    }

    setFollowUpCount(0);
    setAnswer("");
    setIndex((prev) => prev + 1);
  };

  const avgScore = report.length ? (report.reduce((acc, item) => acc + item.score, 0) / report.length).toFixed(1) : "0.0";

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
        <section className="rounded-xl bg-white p-4 shadow-sm lg:col-span-1">
          <h1 className="text-xl font-bold">模拟面试设置</h1>
          <label className="mt-4 block text-sm">面试类型</label>
          <select className="mt-1 w-full rounded border p-2" value={bankId} onChange={(e) => setBankId(e.target.value)}>
            {interviewBanks.map((bank) => (
              <option key={bank.id} value={bank.id}>{bank.name}</option>
            ))}
          </select>
          <label className="mt-4 block text-sm">面试轮次</label>
          <select className="mt-1 w-full rounded border p-2" value={round} onChange={(e) => setRound(e.target.value as InterviewRound)}>
            {rounds.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <p className="mt-4 text-xs text-slate-600">题目预览：{questions.slice(0, 3).map((q) => q.question).join(" / ") || "暂无匹配题目"}</p>
          <button className="mt-4 w-full rounded bg-slate-900 px-4 py-2 text-white" onClick={() => { setStarted(true); setIndex(0); setReport([]); }}>
            开始模拟面试
          </button>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold">面试进行中</h2>
          <p className="mt-2 text-sm text-slate-600">摄像头仅本地显示，不上传。</p>
          <video ref={videoRef} autoPlay muted playsInline className="mt-3 aspect-video w-full rounded bg-black/90" />
          <div className="mt-4 rounded border p-3">
            <p className="text-sm text-slate-500">当前题目</p>
            <p className="mt-1 font-medium">{currentQuestion?.question ?? "已完成全部题目"}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded border px-3 py-2" onClick={speakQuestion}>语音朗读 {speaking ? "(播放中)" : ""}</button>
            <button className="rounded border px-3 py-2" onClick={startRecognition}>语音识别 {listening ? "(识别中)" : ""}</button>
          </div>
          {tip ? <p className="mt-2 text-sm text-amber-600">{tip}</p> : null}
          <textarea
            className="mt-3 min-h-32 w-full rounded border p-3"
            placeholder="手动输入兜底：请输入你的回答"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <button className="mt-3 rounded bg-blue-600 px-4 py-2 text-white" onClick={submitAnswer} disabled={!started || !currentQuestion}>
            提交回答
          </button>

          <div className="mt-6 rounded-xl border bg-slate-50 p-3">
            <h3 className="font-semibold">最终面试报告</h3>
            <p className="text-sm text-slate-600">已完成：{report.length} 题，平均分：{avgScore}</p>
            <ul className="mt-2 space-y-2 text-sm">
              {report.map((item, i) => (
                <li key={`${item.question}-${i}`} className="rounded bg-white p-2">
                  <p className="font-medium">Q{i + 1}: {item.question}</p>
                  <p>得分：{item.score}</p>
                  <p>反馈：{item.feedback}</p>
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
    <Suspense fallback={<main className="min-h-screen bg-slate-100 p-6 text-slate-600">加载面试配置中...</main>}>
      <InterviewPageContent />
    </Suspense>
  );
}
