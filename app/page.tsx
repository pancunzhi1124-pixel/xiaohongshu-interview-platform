import Link from "next/link";
import BankExplorer from "@/components/BankExplorer";
import { examTypeCategories } from "@/data/question-pools/categories";
import { loadStructuredInterviewQuestions } from "@/data/question-pools/structured";

const highlights = ["5 大考试/招聘类型", "结构化真题持续扩充", "1 次 AI 动态追问", "视频感模拟体验"];

export default async function HomePage() {
  const pool = await loadStructuredInterviewQuestions();
  const counts = pool.reduce<Record<string, number>>((acc, item) => {
    const key = item.examType ?? "private-company";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const entries = examTypeCategories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    icon: c.icon,
    path: `/banks/${c.id}`,
    count: counts[c.id] ?? 0,
  }));

  return <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white"><section className="relative isolate px-6 pb-16 pt-10 md:px-10 md:pt-16"><div className="mx-auto max-w-6xl"><h1 className="text-4xl font-bold md:text-6xl">全类型 AI 模拟面试平台</h1><p className="mt-4 text-slate-300">覆盖国考、省考、事业编、国企央企银行、私企民企等五大类。</p><div className="mt-8"><Link href="/interview" className="rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-5 py-3 font-semibold">立即开始模拟</Link></div></div></section><section className="mx-auto max-w-6xl px-6 md:px-10"><div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-center shadow-2xl backdrop-blur md:grid-cols-4">{highlights.map((item) => <p key={item} className="font-semibold text-slate-200">{item}</p>)}</div></section><section id="banks" className="mx-auto mt-12 max-w-6xl px-6 pb-16 md:px-10"><h2 className="text-3xl font-bold">五大题库分类</h2><div className="mt-6"><BankExplorer entries={entries} /></div></section></main>;
}
