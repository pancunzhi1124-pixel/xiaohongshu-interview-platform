import Link from "next/link";
import BankExplorer from "@/components/BankExplorer";
import { interviewBanks } from "@/data/question-banks";
import { examTypeCategories } from "@/data/question-pools/categories";
import { loadStructuredInterviewQuestions } from "@/data/question-pools/structured";
import HeroAnnouncementsPanel from "@/components/home/HeroAnnouncementsPanel";

const highlights = ["5 大主分类", "结构化真题优先", "1 次 AI 动态追问", "视频感模拟体验"];
const featureCards = [["固定题库主问题，避免 AI 跑题", "每个方向沉淀高频核心问题，模拟练习更稳定、可复盘。"], ["AI 动态追问，模拟真实面试官", "根据回答内容实时追问，让你提前适应压力与临场变化。"], ["自动生成报告，定位表达短板", "从结构、岗位匹配与表达说服力给出可执行优化建议。"]];

export default async function HomePage() {
  const structuredQuestions = await loadStructuredInterviewQuestions();
  const structuredCounts = structuredQuestions.reduce<Record<string, number>>((acc, item) => ((acc[item.examType] = (acc[item.examType] ?? 0) + 1), acc), {});
  const fallbackCounts = interviewBanks.reduce<Record<string, number>>((acc, b) => ((acc[b.id] = b.questions.length), acc), {});
  const counts = Object.fromEntries(examTypeCategories.map((c) => [c.id, structuredCounts[c.id] && structuredCounts[c.id] > 0 ? structuredCounts[c.id] : fallbackCounts[c.id] ?? 0]));

  return <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white"><section className="relative isolate px-6 pb-16 pt-10 md:px-10 md:pt-16"><div className="mx-auto max-w-6xl"><nav className="mb-8 flex items-center justify-end gap-5 text-sm text-slate-200"><Link href="/announcements" className="transition hover:text-cyan-300">更新公告</Link><Link href="/interview" className="transition hover:text-cyan-300">开始模拟</Link></nav><div className="grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]"><div><span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-slate-200">AI 面试练习平台</span><h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">全类型 AI 结构化模拟面试</h1><p className="mt-4 text-slate-300 md:text-lg">覆盖国考、省考、事业编、国企央企银行、私企民企等全类型面试场景。</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/interview" className="rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-5 py-3 font-semibold text-white">立即开始模拟</Link><a href="#banks" className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 font-semibold text-slate-100">浏览题库</a></div></div><HeroAnnouncementsPanel /></div></div></section><section className="mx-auto max-w-6xl px-6 md:px-10"><div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-center md:grid-cols-4">{highlights.map((item) => <p key={item} className="font-semibold text-slate-200">{item}</p>)}</div><div className="mt-8 grid gap-4 md:grid-cols-3">{featureCards.map(([title, desc]) => <article key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5"><h2 className="text-lg font-bold tracking-tight text-white">{title}</h2><p className="mt-2 text-sm text-slate-300">{desc}</p></article>)}</div></section><section id="banks" className="mx-auto mt-12 max-w-6xl px-6 pb-16 md:px-10"><h2 className="text-3xl font-bold tracking-tight text-white">五大类面试题库</h2><p className="mt-2 text-slate-300">按全类型分类浏览题目，再进入模拟面试</p><div className="mt-6"><BankExplorer questionCounts={counts} /></div></section></main>;
}
