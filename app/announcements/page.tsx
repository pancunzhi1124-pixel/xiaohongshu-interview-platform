"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  announcementCategoryLabels,
  announcementFileTypeLabels,
  announcements,
  type AnnouncementCategory,
} from "@/data/announcements";

type FilterKey = "all" | AnnouncementCategory;

const filterOptions: { label: string; value: FilterKey }[] = [
  { label: "全部", value: "all" },
  { label: "地区考试", value: "regional-exam" },
  { label: "校园招聘", value: "campus-recruitment" },
];

export default function AnnouncementsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");

  const filteredAnnouncements = useMemo(() => {
    const sorted = [...announcements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (filter === "all") {
      return sorted;
    }
    return sorted.filter((item) => item.category === filter);
  }, [filter]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-cyan-300 transition-colors hover:text-cyan-200">
          ← 返回首页
        </Link>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">更新公告</h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          汇总各地区考试信息、高校校园招聘、报名通知及相关附件，支持 PDF / Excel 下载。
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-xl border px-4 py-2 text-sm transition-colors ${
                filter === option.value
                  ? "border-cyan-300/40 bg-cyan-400/20 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <section className="mt-8 grid gap-4">
          {filteredAnnouncements.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/30">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-cyan-200">
                  {announcementCategoryLabels[item.category]}
                </span>
                <span className="rounded-md border border-purple-300/30 bg-purple-400/10 px-2 py-0.5 text-purple-200">
                  {announcementFileTypeLabels[item.fileType]}
                </span>
                <span className="text-slate-400">发布时间：{item.date}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{item.description}</p>
              <p className="mt-3 text-sm text-slate-400">附件：{item.fileName}</p>

              {item.isAvailable ? (
                <a
                  href={item.fileUrl}
                  download
                  className="mt-4 inline-flex rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-400/20"
                >
                  下载附件
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-4 inline-flex cursor-not-allowed rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-400"
                >
                  附件待上传
                </button>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
