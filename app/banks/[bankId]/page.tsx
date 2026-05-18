import Link from "next/link";
import { notFound } from "next/navigation";
import { interviewBanks } from "@/data/question-banks";

type BankPageProps = {
  params: Promise<{ bankId: string }>;
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
  综合: "HR 初面",
};
const difficultyLabelMap = { easy: "基础", medium: "普通", hard: "进阶" } as const;

export function generateStaticParams() {
  return interviewBanks.map((bank) => ({ bankId: bank.id }));
}

export default async function BankPage({ params }: BankPageProps) {
  const { bankId } = await params;
  const bank = interviewBanks.find((item) => item.id === bankId);
  if (!bank) notFound();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 px-6 py-8 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-slate-200 hover:text-white">← 返回首页</Link>
        <section className="mt-4 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl md:p-10">
          <div className="flex flex-wrap items-center gap-3"><span className="text-4xl">{bank.icon}</span>{bank.badge ? <span className="rounded-full bg-white/20 px-3 py-1 text-xs">{bank.badge}</span> : null}</div>
          <h1 className="mt-3 text-3xl font-black md:text-5xl">{bank.name}</h1>
          <p className="mt-3 text-slate-200">{bank.description}</p>
          <p className="mt-2 text-sm text-slate-300">适合人群：{bank.targetUsers}</p>
          <p className="mt-1 text-sm text-slate-300">题量：{bank.questions.length} 题</p>
          <p className="mt-4 rounded-xl bg-indigo-500/20 p-3 text-sm">查看题目后开始练习，进入模拟更有把握，面试表达更稳。</p>
          <Link href={`/interview?bank=${bank.id}`} className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 font-bold text-indigo-700">开始模拟面试</Link>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-bold">题目列表</h2>
          <div className="mt-4 grid gap-4">
            {bank.questions.map((item, idx) => {
              const key = item.round.find((r) => r !== "综合") ?? item.round[0] ?? "综合";
              const d = item.difficulty ?? (idx % 3 === 0 ? "easy" : idx % 3 === 1 ? "medium" : "hard");
              return (
                <article key={item.id} className="rounded-2xl border border-white/20 bg-white/10 p-5 transition hover:-translate-y-1 hover:bg-white/15">
                  <p className="text-sm text-slate-300">第 {idx + 1} 题</p>
                  <p className="mt-2 font-medium">{item.question}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white/20 px-3 py-1">分类：{item.category ?? bank.category}</span>
                    <span className="rounded-full bg-white/20 px-3 py-1">轮次：{roundLabelMap[key] ?? key}</span>
                    <span className="rounded-full bg-white/20 px-3 py-1">难度：{difficultyLabelMap[d]}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
