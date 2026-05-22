import Link from "next/link";
import HeroAnnouncementsPanel from "@/components/home/HeroAnnouncementsPanel";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import FloatingOrbs from "@/components/ui/FloatingOrbs";
import InteractiveGridBackground from "@/components/ui/InteractiveGridBackground";

const highlights = ["5 大主分类", "结构化真题优先", "1 次 AI 动态追问", "视频模拟体验"];

const featureCards = [
  ["固定题库主问题，避免 AI 跑题", "每个方向沉淀高频核心问题，模拟练习更稳定、可复盘。"],
  ["AI 动态追问，模拟真实面试官", "根据回答内容实时追问，让你提前适应压力与临场变化。"],
  ["自动生成报告，定位表达短板", "从结构、岗位匹配与表达说服力给出可执行优化建议。"],
] as const;

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <AnimatedBackground />
      <FloatingOrbs />

      <section className="relative isolate px-6 pb-16 pt-8 md:px-10 md:pt-12">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-slate-950/35">
          <InteractiveGridBackground />
          <div className="relative z-10 grid items-start gap-8 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] md:px-8 md:py-10">
            <div>
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-slate-200">AI 面试练习平台</span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">全类型 AI 结构化模拟面试</h1>
              <p className="mt-4 text-slate-300 md:text-lg">覆盖国考、省考、事业编、国企央企银行、私企民企等全类型面试场景。</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/interview"
                  className="rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-5 py-3 font-semibold text-white"
                >
                  立即开始模拟
                </Link>
                <Link href="/banks" className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 font-semibold text-slate-100">
                  浏览题库
                </Link>
              </div>
            </div>
            <HeroAnnouncementsPanel />
          </div>
        </div>
      </section>

      <section id="usage-guide" className="mx-auto max-w-6xl px-6 pb-16 md:px-10">
        <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-center md:grid-cols-4">
          {highlights.map((item) => (
            <p key={item} className="font-semibold text-slate-200">
              {item}
            </p>
          ))}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {featureCards.map(([title, desc]) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
              <p className="mt-2 text-sm text-slate-300">{desc}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
