import Link from "next/link";
import { externalInfoLinks } from "@/data/external-links";

const infoItems = [externalInfoLinks.campusRecruitment, externalInfoLinks.examAndEnterprise];

export default function AnnouncementsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-slate-300">
          ← 返回首页
        </Link>
        <header className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-3xl font-bold tracking-tight">更新公告</h1>
          <p className="mt-2 text-slate-300">仅保留两个真实信息库入口，点击按钮可跳转查看最新信息。</p>
        </header>

        <section className="mt-6 rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-6 shadow-lg shadow-cyan-950/30 backdrop-blur">
          <h2 className="text-2xl font-bold text-cyan-200">最新考试与招聘信息库</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">以下信息库每日更新，节假日不更新。</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {infoItems.map((item) => (
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
                  {item.buttonText}库
                </a>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
