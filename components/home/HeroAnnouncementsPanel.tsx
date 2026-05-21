import Link from "next/link";
import { announcementCategoryLabels, announcementFileTypeLabels, announcements } from "@/data/announcements";

const latestAnnouncements = [...announcements]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 4);

export default function HeroAnnouncementsPanel() {
  return (
    <aside className="rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-5 shadow-lg shadow-cyan-900/20 backdrop-blur-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold tracking-wide text-cyan-300">更新公告</p>
        <p className="mt-1 text-xs text-slate-300">各地区考试信息 / 高校校园招聘 / 附件下载</p>
      </div>

      <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-slate-950/40">
        {latestAnnouncements.map((item) => (
          <Link
            key={item.id}
            href="/announcements"
            className="block px-4 py-3 transition-colors hover:bg-white/5"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-cyan-200">
                {announcementCategoryLabels[item.category]}
              </span>
              <span className="rounded-md border border-purple-300/30 bg-purple-400/10 px-2 py-0.5 text-purple-200">
                {announcementFileTypeLabels[item.fileType]}
              </span>
              <span className="text-slate-400">{item.date}</span>
            </div>
            <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-white">{item.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">{item.description}</p>
          </Link>
        ))}
      </div>

      <Link
        href="/announcements"
        className="mt-4 inline-flex items-center text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200"
      >
        查看全部公告 →
      </Link>
    </aside>
  );
}
