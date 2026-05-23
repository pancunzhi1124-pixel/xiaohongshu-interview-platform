import { externalInfoLinks } from "@/data/external-links";

const infoItems = [externalInfoLinks.campusRecruitment, externalInfoLinks.examAndEnterprise];

export default function HeroAnnouncementsPanel() {
  return (
    <aside className="rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-5 shadow-lg shadow-cyan-950/40 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-cyan-300">更新公告</p>
          <p className="mt-1 text-xs text-slate-300">仅保留两个真实信息库入口</p>
        </div>
        <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-cyan-300" />
      </div>

      <div className="mt-4 space-y-3">
        {infoItems.map((item) => (
          <a
            key={item.title}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl border border-cyan-300/20 bg-white/5 p-4 transition hover:shadow-[0_0_24px_rgba(34,211,238,0.22)]"
          >
            <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-100">
              {item.tag}
            </span>
            <p className="mt-3 text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-1 text-xs leading-6 text-slate-300">{item.description}</p>
            <p className="mt-2 text-xs text-cyan-100">{item.updateNote}</p>
            <span className="mt-3 inline-flex rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90">
              {item.buttonText}库
            </span>
          </a>
        ))}
      </div>
    </aside>
  );
}
