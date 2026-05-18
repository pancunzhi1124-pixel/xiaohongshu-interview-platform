import Link from "next/link";
import BankExplorer from "@/components/BankExplorer";
import { interviewBanks } from "@/data/question-banks";

const highlights = ["14+ 面试方向", "70+ 高频问题", "AI 动态追问", "视频感模拟体验"];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <section className="relative isolate px-6 pb-16 pt-10 md:px-10 md:pt-16">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,#7c3aed66,transparent_35%),radial-gradient(circle_at_80%_20%,#3b82f666,transparent_35%),linear-gradient(135deg,#020617,#1e1b4b_55%,#312e81)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs">AI 面试练习平台</span>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">多类型 AI 视频感模拟面试</h1>
            <p className="mt-4 text-slate-200 md:text-lg">覆盖通用求职、应届生、运营、电商、直播、销售、客服、行政人事、产品、技术、数据分析、财务、教育、英文面试等方向。</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/interview" className="rounded-xl bg-white px-5 py-3 font-semibold text-indigo-700 transition hover:-translate-y-0.5">立即开始模拟</Link>
              <a href="#banks" className="rounded-xl border border-white/50 bg-white/10 px-5 py-3 font-semibold text-white">浏览题库</a>
            </div>
          </div>
          <div className="rounded-3xl border border-white/30 bg-white/10 p-6 backdrop-blur-xl">
            <p className="text-sm text-slate-200">模拟面试报告预览</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-white/15 p-3"><p className="text-sm">表达结构完整度</p><p className="text-xl font-bold">8.9 / 10</p></div>
              <div className="rounded-2xl bg-white/15 p-3"><p className="text-sm">追问应对能力</p><p className="text-xl font-bold">A-</p></div>
              <p className="rounded-2xl bg-indigo-500/30 p-3 text-sm">AI 建议：STAR 案例更聚焦结果量化，下一轮通过率可提升。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur md:grid-cols-4">
          {highlights.map((item) => <p key={item} className="font-semibold text-slate-100">{item}</p>)}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["固定题库，主问题更稳定", "每个岗位沉淀高频核心题，让练习更有方向。"],
            ["AI 追问，模拟真实面试官", "依据你的回答实时动态追问，逼近真实面试节奏。"],
            ["生成报告，定位表达短板", "从结构、案例、说服力给出可执行改进建议。"],
          ].map(([title, desc]) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur hover:-translate-y-1 transition">
              <h2 className="text-lg font-bold">{title}</h2><p className="mt-2 text-sm text-slate-300">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="banks" className="mx-auto mt-12 max-w-6xl px-6 pb-16 md:px-10">
        <h2 className="text-3xl font-black">选择你的面试方向</h2>
        <p className="mt-2 text-slate-300">先查看题目，再开始对应岗位模拟</p>
        <div className="mt-6"><BankExplorer banks={interviewBanks} /></div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 md:px-10">
        <div className="rounded-3xl border border-indigo-300/30 bg-gradient-to-r from-indigo-600/50 to-purple-600/50 p-8 text-center">
          <h3 className="text-2xl font-black">准备好开始一次真实感模拟面试了吗？</h3>
          <Link href="/interview" className="mt-5 inline-flex rounded-xl bg-white px-6 py-3 font-bold text-indigo-700">开始模拟面试</Link>
        </div>
      </section>
    </main>
  );
}
