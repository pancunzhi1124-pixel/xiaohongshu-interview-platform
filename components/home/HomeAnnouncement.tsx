export default function HomeAnnouncement() {
  return (
    <section id="announcement" className="mx-auto mt-4 max-w-6xl px-6 md:px-10">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/20 bg-slate-900/70 px-4 py-2.5">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 rounded-md border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-xs font-semibold text-cyan-200">
            平台公告
          </span>
          <p className="text-sm leading-6 text-slate-200">
            公告｜结构化面试题库持续更新，参考答案正在人工优化审核中。建议优先练习 2024-2025 高频真题，后续将继续补充更多地区与岗位题目。
          </p>
        </div>
        <a href="#banks" className="shrink-0 text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200">
          查看题库
        </a>
      </div>
    </section>
  );
}
