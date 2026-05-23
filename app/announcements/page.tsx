"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  announcements,
  announcementCategoryLabels,
  announcementFileTypeLabels,
  type AnnouncementCategory,
} from "@/data/announcements";
import { externalInfoLinks } from "@/data/external-links";

type CategoryFilter = "all" | AnnouncementCategory;

const filterOptions: { label: string; value: CategoryFilter }[] = [
  { label: "全部", value: "all" },
  { label: "地区考试", value: "regional-exam" },
  { label: "校园招聘", value: "campus-recruitment" },
];

const pinnedByCategory: Record<CategoryFilter, Array<(typeof externalInfoLinks)[keyof typeof externalInfoLinks]>> = {
  all: [externalInfoLinks.examAndEnterprise],
  "regional-exam": [externalInfoLinks.examAndEnterprise],
  "campus-recruitment": [externalInfoLinks.campusRecruitment],
};

export default function AnnouncementsPage() {
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filteredAnnouncements = useMemo(() => {
    const sorted = [...announcements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return category === "all" ? sorted : sorted.filter((item) => item.category === category);
  }, [category]);

  const pinnedItems = pinnedByCategory[category];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-slate-300">← 返回首页</Link>
        <header className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-3xl font-bold tracking-tight">更新公告</h1>
          <p className="mt-2 text-slate-300">
            汇总各地区考试信息、高校校园招聘、报名通知及相关附件，支持 PDF / Excel 下载。
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-6 shadow-lg shadow-cyan-950/30 backdrop-blur">
          <h2 className="text-2xl font-bold text-cyan-200">最新考试与招聘信息库</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            以下信息库每日更新，节假日不更新。点击后将跳转至飞书资料库查看最新信息。
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[externalInfoLinks.campusRecruitment, externalInfoLinks.examAndEnterprise].map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-cyan-300/20 bg-white/5 p-5 transition hover:shadow-[0_0_28px_rgba(34,211,238,0.22)]"
              >
                <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-100">
                  {item.tag}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                <p className="mt-2 text-sm text-cyan-100">{item.updateNote}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {item.buttonText}
                </a>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCategory(option.value)}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                category === option.value
                  ? "border-cyan-400/40 bg-cyan-400/20 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <section className="mt-6 grid gap-4">
          {pinnedItems.map((item) => (
            <article
              key={`pinned-${item.title}`}
              className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-5 transition hover:shadow-[0_0_28px_rgba(34,211,238,0.22)]"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-cyan-200">置顶</span>
                <span className="rounded-full border border-violet-300/30 bg-violet-400/10 px-2 py-0.5 text-violet-200">{item.tag}</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-white">{item.title}每日更新</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}{item.updateNote}。</p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                {item.buttonText}库
              </a>
            </article>
          ))}

          {filteredAnnouncements.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-cyan-200">
                  {announcementCategoryLabels[item.category]}
                </span>
                <span>{item.date}</span>
                <span className="rounded-full border border-violet-300/30 bg-violet-400/10 px-2 py-0.5 text-violet-200">
                  {announcementFileTypeLabels[item.fileType]}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-semibold">
                <Link href={`/announcements/${item.id}`} className="cursor-pointer transition hover:text-cyan-300 hover:underline focus-visible:text-cyan-300">
                  {item.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
