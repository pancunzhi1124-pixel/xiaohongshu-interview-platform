import Link from "next/link";
import BankExplorer from "@/components/BankExplorer";
import { interviewBanks } from "@/data/question-banks";
import { loadStructuredInterviewQuestions } from "@/data/question-pools/structured";

const highlights = ["14+ 面试方向", "70+ 高频问题", "1 次 AI 动态追问", "视频感模拟体验"];

const featureCards = [
  ["固定题库主问题，避免 AI 跑题", "每个岗位沉淀高频核心问题，模拟练习更稳定、可复盘。"],
  ["AI 动态追问，模拟真实面试官", "根据回答内容实时追问，让你提前适应压力与临场变化。"],
  ["自动生成报告，定位表达短板", "从结构、岗位匹配与表达说服力给出可执行优化建议。"],
];

export default async function HomePage() {
  const structuredQuestions = await loadStructuredInterviewQuestions();
  const structuredCounts = structuredQuestions.reduce<Record<string, number>>((acc, item) => {
    acc[item.bankId] = (acc[item.bankId] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <section className="relative isolate px-6 pb-16 pt-10 md:px-10 md:pt-16">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 left-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.20),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(99,102,241,0.22),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(168,85,247,0.16),transparent_30%)]" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-slate-200">AI 面试练习平台</span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">多类型 AI 视频感模拟面试</h1>
            <p className="mt-4 text-slate-300 md:text-lg">覆盖通用求职、应届生、运营、电商、直播、销售、客服、行政人事、产品、技术、数据分析、财务、教育、英文面试等方向。</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/interview" className="rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition duration-300 hover:brightness-110">立即开始模拟</Link>
              <a href="#banks" className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 font-semibold text-slate-100 transition duration-300 hover:bg-white/15">浏览题库</a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <p className="text-sm text-slate-300">AI 面试报告预览</p>
            <div className="mt-4 rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 p-5">
              <p className="text-sm text-slate-300">综合得分</p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-white">8.6 / 10</p>
              {["表达清晰度", "岗位匹配度", "追问表现"].map((metric, idx) => {
                const value = [88, 84, 82][idx];
                return (
                  <div key={metric} className="mt-4">
                    <div className="flex items-center justify-between text-sm"><span className="text-slate-300">{metric}</span><span className="text-cyan-300">{value}%</span></div>
                    <div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" style={{ width: `${value}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-center shadow-2xl backdrop-blur md:grid-cols-4">
          {highlights.map((item) => <p key={item} className="font-semibold text-slate-200">{item}</p>)}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {featureCards.map(([title, desc]) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/10">
              <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
              <p className="mt-2 text-sm text-slate-300">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="banks" className="mx-auto mt-12 max-w-6xl px-6 pb-16 md:px-10">
        <h2 className="text-3xl font-bold tracking-tight text-white">选择你的面试方向</h2>
        <p className="mt-2 text-slate-300">先查看题目，再进入对应岗位模拟</p>
        <div className="mt-6"><BankExplorer banks={interviewBanks} questionCounts={structuredCounts} /></div>
      </section>
    </main>
  );
}
