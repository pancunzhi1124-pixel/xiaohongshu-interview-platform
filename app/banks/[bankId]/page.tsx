import Link from "next/link";
import { notFound } from "next/navigation";
import { interviewBanks } from "@/data/question-banks";

type PageProps = {
  params: {
    bankId: string;
  };
};

const roundLabelMap: Record<string, string> = {
  hr: "HR 初面",
  business: "业务面",
  manager: "主管面",
  final: "终面",
  stress: "压力面",
  english: "英文面试",
  HR: "HR 初面",
  业务: "业务面",
  主管: "主管面",
  终面: "终面",
  压力: "压力面",
  英文: "英文面试",
  综合: "综合面",
};

const difficultyLabelMap: Record<string, string> = {
  easy: "基础",
  medium: "普通",
  hard: "进阶",
};

function getRoundLabel(rounds: string[]) {
  const firstSpecific = rounds.find((item) => item !== "综合") ?? rounds[0] ?? "综合";
  return roundLabelMap[firstSpecific] ?? firstSpecific;
}

function getDifficultyLabel(index: number, total: number) {
  const ratio = (index + 1) / Math.max(total, 1);
  if (ratio <= 0.34) return difficultyLabelMap.easy;
  if (ratio <= 0.67) return difficultyLabelMap.medium;
  return difficultyLabelMap.hard;
}

export function generateStaticParams() {
  return interviewBanks.map((bank) => ({ bankId: bank.id }));
}

export default function BankDetailPage({ params }: PageProps) {
  const bank = interviewBanks.find((item) => item.id === params.bankId);
  if (!bank) notFound();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/50 to-indigo-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex text-sm font-medium text-slate-600 hover:text-slate-900">← 返回首页</Link>

        <section className="mt-4 rounded-3xl border border-white/70 bg-white/85 p-7 shadow-xl shadow-blue-100/50 md:p-10">
          <h1 className="text-3xl font-bold text-slate-900">{bank.title}</h1>
          <p className="mt-3 text-slate-600">{bank.description}</p>
          <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <p className="rounded-xl bg-slate-50 p-3"><span className="font-medium text-slate-800">适合人群：</span>希望系统准备 {bank.title} 的求职者</p>
            <p className="rounded-xl bg-slate-50 p-3"><span className="font-medium text-slate-800">题量：</span>{bank.questions.length} 题</p>
          </div>
          <Link href={`/interview?bank=${bank.id}`} className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:-translate-y-0.5 hover:bg-slate-700">
            开始模拟面试
          </Link>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold text-slate-900">题目列表</h2>
          <div className="mt-4 space-y-3">
            {bank.questions.map((item, idx) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <p className="text-sm text-slate-500">第 {idx + 1} 题</p>
                <p className="mt-2 text-base font-medium text-slate-900">{item.question}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">分类：{bank.title}</span>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">轮次：{getRoundLabel(item.round)}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">难度：{getDifficultyLabel(idx, bank.questions.length)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
