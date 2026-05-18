import Link from "next/link";
import { interviewBanks } from "@/data/question-banks";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <section className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">多类型 AI 视频感模拟面试</h1>
        <p className="mt-3 text-slate-600">支持题库选择、轮次训练、AI 评分追问与最终报告。</p>
        <Link
          href="/interview"
          className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700"
        >
          开始模拟面试
        </Link>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {interviewBanks.map((bank) => (
            <article key={bank.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">{bank.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{bank.description}</p>
              <p className="mt-3 text-xs text-slate-500">题量：{bank.questions.length} 题</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
