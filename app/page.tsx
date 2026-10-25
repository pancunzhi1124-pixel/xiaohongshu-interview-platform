import Link from "next/link";

const workspaces = [
  { href: "/distill", number: "01", eyebrow: "KNOWLEDGE DISTILLATION", title: "心理学书籍与课程蒸馏", description: "把书籍章节、教师课程、讲义和个人笔记整理成有来源、有边界、可复用的知识卡片。", action: "开始蒸馏", icon: "📚" },
  { href: "/lesson-plans", number: "02", eyebrow: "CLASS MEETING STUDIO", title: "主题班会教案工坊", description: "从班级真实需求出发，生成流程、教师引导语、学生任务、板书提纲和课后复盘。", action: "设计班会", icon: "🧭" },
];

const principles = [
  ["来源可追溯", "记录书名、章节页码、课程讲师和时间戳，区分来源观点与教学转化。"],
  ["活动可落地", "每个环节明确时长、目标、材料、教师话术和学生参与方式。"],
  ["心理安全优先", "不强迫学生披露隐私，不贴标签，不用一次班会替代专业支持。"],
];

export default function HomePage() {
  return <main id="top" className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-500 text-xl">知</span><span><strong className="block text-sm md:text-base">知心教研工作台</strong><span className="text-xs text-slate-400">心理知识 · 教师课程 · 主题班会</span></span></Link>
        <nav className="flex items-center gap-3 text-sm"><Link href="/distill" className="hidden text-slate-300 hover:text-cyan-200 sm:block">知识蒸馏</Link><Link href="/lesson-plans" className="rounded-xl bg-cyan-300 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-200">创建教案</Link></nav>
      </div>
    </header>
    <section className="relative px-5 pb-14 pt-14 md:px-8 md:pb-20 md:pt-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.13),transparent_42%),radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.13),transparent_35%)]"/>
      <div className="relative mx-auto max-w-6xl">
        <p className="inline-flex rounded-full border border-cyan-200/20 bg-cyan-200/5 px-3 py-1 text-xs font-medium tracking-wide text-cyan-200">从知识整理，到真实课堂</p>
        <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">把心理学与好课程，<span className="text-cyan-300">变成有温度的班会。</span></h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">为班主任和教育工作者打造的教研工作台：蒸馏心理学书籍、整理优秀教师课程，再把知识转化为适龄、可执行、可复盘的主题班会教案。</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/distill" className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-100">整理一份资料 ↗</Link><Link href="/lesson-plans" className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white hover:bg-white/10">直接设计班会</Link></div>
      </div>
    </section>
    <section className="mx-auto max-w-6xl px-5 pb-12 md:px-8">
      <div className="grid gap-4 md:grid-cols-2">{workspaces.map(item=><Link key={item.href} href={item.href} className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-cyan-200/30 hover:bg-white/[0.07] md:p-8"><div className="flex items-start justify-between"><span className="text-3xl">{item.icon}</span><span className="text-sm text-slate-500">{item.number}</span></div><p className="mt-7 text-xs font-semibold tracking-[0.16em] text-cyan-300">{item.eyebrow}</p><h2 className="mt-2 text-2xl font-bold">{item.title}</h2><p className="mt-3 min-h-14 leading-7 text-slate-300">{item.description}</p><span className="mt-6 inline-flex text-sm font-semibold text-cyan-200">{item.action} <span className="ml-2 transition group-hover:translate-x-1">→</span></span></Link>)}</div>
    </section>
    <section className="mx-auto max-w-6xl px-5 pb-16 md:px-8 md:pb-20"><div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 md:p-8"><p className="text-sm font-semibold text-slate-400">工作原则</p><div className="mt-5 grid gap-6 md:grid-cols-3">{principles.map(([title,desc],i)=><article key={title}><div className="text-sm text-cyan-300">0{i+1}</div><h3 className="mt-2 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p></article>)}</div></div><footer className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>知心教研工作台 · 面向教育实践的知识整理工具</span><span>尊重版权 · 保护学生隐私 · 资料可追溯</span></footer></section>
  </main>;
}
