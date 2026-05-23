import Link from "next/link";
import { notFound } from "next/navigation";
import {
  announcements,
  announcementCategoryLabels,
  announcementFileTypeLabels,
} from "@/data/announcements";
import { externalInfoLinks } from "@/data/external-links";

type AnnouncementDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AnnouncementDetailPage({ params }: AnnouncementDetailPageProps) {
  const { id } = await params;
  const item = announcements.find((announcement) => announcement.id === id);

  if (!item) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white md:px-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/announcements" className="inline-flex text-sm text-slate-300 transition hover:text-cyan-300">
          ← 返回公告列表
        </Link>

        <article className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-cyan-200">
              {announcementCategoryLabels[item.category]}
            </span>
            <span>{item.date}</span>
            <span className="rounded-full border border-violet-300/30 bg-violet-400/10 px-2 py-0.5 text-violet-200">
              {announcementFileTypeLabels[item.fileType]}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{item.title}</h1>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-200">{item.detail ?? item.description}</p>
        </article>


        <section className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-cyan-200">最新考试与招聘信息库</h2>
          <p className="mt-2 text-sm text-slate-300">每日更新，节假日不更新。</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[externalInfoLinks.campusRecruitment, externalInfoLinks.examAndEnterprise].map((linkItem) => (
              <a
                key={linkItem.title}
                href={linkItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-cyan-300/20 bg-white/5 px-4 py-3 text-sm text-slate-100 transition hover:shadow-[0_0_24px_rgba(34,211,238,0.22)]"
              >
                {linkItem.title}
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-cyan-200">附件下载</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-200">
            <p>文件名：{item.fileName}</p>
            <p>文件类型：{announcementFileTypeLabels[item.fileType]}</p>
          </div>
          {item.isAvailable ? (
            <a
              href={item.fileUrl}
              download
              className="mt-5 inline-flex rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-400"
            >
              下载附件
            </a>
          ) : (
            <p className="mt-5 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              附件暂未上传，请稍后查看。
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
