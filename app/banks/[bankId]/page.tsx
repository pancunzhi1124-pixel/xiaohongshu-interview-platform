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
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-8 text-white md:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 left-4 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-4 top-0 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-slate-300 transition hover:text-white">← 返回首页</Link>
        <section className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-4xl">{bank.icon}</span>
            {bank.badge ? <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs text-white">{bank.badge}</span> : null}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-5xl">{bank.name}</h1>
          <p className="mt-3 text-slate-300">{bank.description}</p>
          <p className="mt-2 text-sm text-slate-400">适合人群：{bank.targetUsers}</p>
          <p className="mt-1 text-sm text-cyan-300">题量：{bank.questions.length} 题</p>
          <Link href={`/interview?bank=${bank.id}`} className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition duration-300 hover:brightness-110">开始模拟面试</Link>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-bold tracking-tight text-white">题目列表</h2>
          <div className="mt-4 grid gap-4">
            {bank.questions.map((item, idx) => {
              const key = item.round.find((r) => r !== "综合") ?? item.round[0] ?? "综合";
              const d = item.difficulty ?? (idx % 3 === 0 ? "easy" : idx % 3 === 1 ? "medium" : "hard");
              return (
                <article key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-300">第 {idx + 1} 题</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-3 py-1 text-cyan-200">{roundLabelMap[key] ?? key}</span>
                      <span className="rounded-full border border-blue-300/30 bg-blue-400/15 px-3 py-1 text-blue-200">{difficultyLabelMap[d]}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-base text-white md:text-lg">{item.question}</p>
                  <div className="mt-4 text-xs">
                    <span className="rounded-full border border-purple-300/30 bg-purple-400/15 px-3 py-1 text-purple-200">分类：{item.category ?? bank.category}</span>
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
