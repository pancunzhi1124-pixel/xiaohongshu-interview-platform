import Link from "next/link";

export default function AnnouncementNotFound() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white md:px-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center">
        <p className="text-lg font-semibold text-slate-100">公告不存在或已下线</p>
        <Link
          href="/announcements"
          className="mt-6 inline-flex rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-400"
        >
          返回公告列表
        </Link>
      </div>
    </main>
  );
}
