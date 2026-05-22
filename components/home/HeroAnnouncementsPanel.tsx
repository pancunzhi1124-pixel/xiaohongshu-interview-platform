import Link from "next/link";
import { announcements, announcementCategoryLabels, announcementFileTypeLabels } from "@/data/announcements";

const latestAnnouncements = [...announcements]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 4);

export default function HeroAnnouncementsPanel() {
  return (
    <aside className="rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-5 shadow-lg shadow-cyan-950/40 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-cyan-300">更新公告</p>
          <p className="mt-1 text-xs text-slate-300">各地区考试信息 / 高校校园招聘 / 附件下载</p>
        </div>
        <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-cyan-300" />
      </div>

      <div className="mt-4 divide-y divide-white/10">
        {latestAnnouncements.map((item) => (
          <Link
            key={item.id}
            href={`/announcements/${item.id}`}
            className="block rounded-lg px-3 py-3 transition hover:bg-white/10"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-cyan-200">
                {announcementCategoryLabels[item.category]}
              </span>
              <span>{item.date}</span>
              <span className="rounded-full border border-violet-300/30 bg-violet-400/10 px-2 py-0.5 text-violet-200">
                {announcementFileTypeLabels[item.fileType]}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-1 text-xs leading-6 text-slate-300">{item.description}</p>
          </Link>
        ))}
      </div>

      <Link
        href="/announcements"
        className="mt-4 inline-flex rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/20"
      >
        查看全部公告 →
      </Link>
    </aside>
  );
}
