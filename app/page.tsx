import Link from "next/link";
import { interviewBanks } from "@/data/question-banks";

const highlights = [
  {
    title: "固定题库主问题",
    desc: "每个方向沉淀核心高频主问题，训练更有针对性。",
  },
  {
    title: "AI 动态追问",
    desc: "根据你的回答实时生成追问，模拟真实面试压力。",
  },
  {
    title: "生成面试表现报告",
    desc: "自动汇总得分与反馈，帮你快速定位短板并迭代。",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/60 to-indigo-50 p-6 md:p-10">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl shadow-blue-100/60 backdrop-blur md:p-12">
          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            AI 面试练习平台
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">多类型 AI 视频感模拟面试</h1>
          <p className="mt-4 max-w-4xl text-slate-600 md:text-lg">
            覆盖通用求职、应届生、运营、电商、直播、销售、客服、行政人事、产品、技术、数据分析、财务、教育、英文面试等方向。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/interview" className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:-translate-y-0.5 hover:bg-slate-700">
              开始模拟面试
            </Link>
            <a href="#question-banks" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50">
              浏览题库
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <article key={item.title} className="rounded-2xl border border-blue-100 bg-white/80 p-5 shadow-md shadow-blue-100/40 transition hover:-translate-y-1 hover:shadow-lg">
              <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
            </article>
          ))}
        </div>

        <section id="question-banks" className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-900">题库方向</h2>
            <p className="text-sm text-slate-500">共 {interviewBanks.length} 个面试类型</p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {interviewBanks.map((bank) => (
              <article key={bank.id} className="group rounded-3xl border border-indigo-100 bg-gradient-to-b from-white to-indigo-50/40 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100">
                <h3 className="text-lg font-semibold text-slate-900">{bank.title}</h3>
                <p className="mt-2 min-h-10 text-sm text-slate-600">{bank.description}</p>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p><span className="font-medium text-slate-800">适合人群：</span>希望提升 {bank.title} 面试表现的求职者</p>
                  <p><span className="font-medium text-slate-800">题量：</span>{bank.questions.length} 题</p>
                </div>
                <Link href={`/banks/${bank.id}`} className="mt-5 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition group-hover:border-indigo-200 group-hover:text-indigo-700">
                  查看题目
                </Link>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
