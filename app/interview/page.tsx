"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { interviewBanks, type InterviewRound } from "@/data/question-banks";

const rounds: InterviewRound[] = ["综合", "HR", "业务", "主管", "终面", "压力", "英文"];

type ReportItem = { question: string; answer: string; score: number; feedback: string };
type SpeechRecognitionEventLike = { results: { [index: number]: { [index: number]: { transcript: string } } } };
type SpeechRecognitionLike = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onstart: (() => void) | null; onresult: ((event: SpeechRecognitionEventLike) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const browserWindow = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
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

  useEffect(() => { if (queryBankId && interviewBanks.some((bank) => bank.id === queryBankId)) setBankId(queryBankId); }, [queryBankId]);

  const currentBank = useMemo(() => interviewBanks.find((x) => x.id === bankId) ?? interviewBanks[0], [bankId]);
  const questions = useMemo(() => (currentBank?.questions ?? []).filter((q) => q.round.includes(round)), [currentBank, round]);
  const currentQuestion = questions[index];

  useEffect(() => {
    const initCamera = async () => {
      if (!started || !videoRef.current || typeof navigator === "undefined") return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      videoRef.current.srcObject = stream;
    };
    initCamera().catch(() => null);
    return () => { const stream = videoRef.current?.srcObject as MediaStream | null; stream?.getTracks().forEach((t) => t.stop()); };
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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: currentQuestion.question, answer, expectedPoints: currentQuestion.expectedPoints, scoringRubric: currentQuestion.scoringRubric, followUpCount }),
    });
    const result = (await res.json()) as { score: number; followUpNeeded: boolean; followUpQuestion: string; shortFeedback: string };
    setReport((prev) => [...prev, { question: currentQuestion.question, answer, score: result.score, feedback: result.shortFeedback }]);
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
    <main className="relative min-h-screen overflow-hidden bg-slate-950 p-6 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 left-4 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-6 top-6 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur lg:col-span-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">模拟面试设置</h1>
          <label className="mt-5 block text-sm text-slate-300">面试类型</label>
          <select className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400" value={bankId} onChange={(e) => setBankId(e.target.value)}>
            {interviewBanks.map((bank) => <option key={bank.id} value={bank.id}>{bank.name}</option>)}
          </select>
          <label className="mt-4 block text-sm text-slate-300">面试轮次</label>
          <select className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400" value={round} onChange={(e) => setRound(e.target.value as InterviewRound)}>
            {rounds.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <p className="mt-4 text-xs text-slate-400">题目预览：{questions.slice(0, 2).map((q) => q.question).join(" / ") || "暂无匹配题目"}</p>
          <button className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => { setStarted(true); setIndex(0); setReport([]); }} disabled={!questions.length}>
            开始模拟面试
          </button>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur lg:col-span-2">
          <h2 className="text-xl font-bold tracking-tight text-white">面试进行中</h2>
          <p className="mt-2 text-sm text-slate-300">摄像头仅本地显示，不上传。</p>
          <div className="mt-3 overflow-hidden rounded-3xl border border-white/10 bg-black/70">
            <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full" />
            {!started ? <div className="grid aspect-video place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_70%_70%,rgba(168,85,247,0.2),transparent_40%)] text-slate-300">点击左侧按钮开始模拟并开启摄像头预览</div> : null}
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-3 py-1 text-cyan-200">题号：{Math.min(index + 1, questions.length)}</span>
              <span className="rounded-full border border-blue-300/30 bg-blue-400/15 px-3 py-1 text-blue-200">题库：{currentBank?.name}</span>
              <span className="rounded-full border border-purple-300/30 bg-purple-400/15 px-3 py-1 text-purple-200">轮次：{round}</span>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-emerald-200">难度：{currentQuestion?.difficulty ?? "普通"}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">当前题目</p>
            <p className="mt-1 text-lg text-white md:text-xl">{currentQuestion?.question ?? "已完成全部题目"}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white transition hover:bg-white/15" onClick={speakQuestion}>语音朗读 {speaking ? "(播放中)" : ""}</button>
            <button className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white transition hover:bg-white/15" onClick={startRecognition}>语音识别 {listening ? "(识别中)" : ""}</button>
            <button className="rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-4 py-2 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50" onClick={submitAnswer} disabled={!started || !currentQuestion}>提交回答</button>
          </div>
          {tip ? <p className="mt-2 text-sm text-amber-300">{tip}</p> : null}

          <textarea className="mt-4 min-h-32 w-full rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-white placeholder:text-slate-500 outline-none focus:border-cyan-400" placeholder="手动输入兜底：请输入你的回答" value={answer} onChange={(e) => setAnswer(e.target.value)} />

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
            <h3 className="text-xl font-bold tracking-tight text-white">最终面试报告</h3>
            <div className="mt-3 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-4">
              <p className="text-sm text-slate-300">综合得分</p>
              <p className="text-3xl font-bold text-white">{avgScore} / 10</p>
              <p className="text-sm text-slate-400">已完成：{report.length} 题</p>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {report.map((item, i) => (
                <li key={`${item.question}-${i}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="font-medium text-white">Q{i + 1}: {item.question}</p>
                  <p className="mt-1 text-slate-300">得分：{item.score}</p>
                  <p className="mt-1 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-2 text-emerald-200">优势：表达较连贯，核心观点明确。</p>
                  <p className="mt-1 rounded-xl border border-red-300/20 bg-red-400/10 p-2 text-red-200">不足：案例量化细节可进一步加强。</p>
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
