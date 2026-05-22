import BankExplorer from "@/components/BankExplorer";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import FloatingOrbs from "@/components/ui/FloatingOrbs";
import { interviewBanks } from "@/data/question-banks";
import { examTypeCategories } from "@/data/question-pools/categories";
import { loadStructuredInterviewQuestions } from "@/data/question-pools/structured";

export default async function BanksPage() {
  const structuredQuestions = await loadStructuredInterviewQuestions();
  const structuredCounts = structuredQuestions.reduce<Record<string, number>>(
    (acc, item) => ((acc[item.examType] = (acc[item.examType] ?? 0) + 1), acc),
    {},
  );
  const fallbackCounts = interviewBanks.reduce<Record<string, number>>((acc, bank) => ((acc[bank.id] = bank.questions.length), acc), {});

  const counts = Object.fromEntries(
    examTypeCategories.map((category) => [
      category.id,
      structuredCounts[category.id] && structuredCounts[category.id] > 0
        ? structuredCounts[category.id]
        : (fallbackCounts[category.id] ?? 0),
    ]),
  );

  return (
    <main className="relative min-h-screen px-6 py-8 md:px-10">
      <AnimatedBackground />
      <FloatingOrbs />
      <section className="relative z-10 mx-auto max-w-6xl pb-12">
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">五大类面试题库</h1>
        <p className="mt-2 text-slate-300">按全类型分类浏览题目，再进入模拟面试。</p>
        <div className="mt-6">
          <BankExplorer questionCounts={counts} />
        </div>
      </section>
    </main>
  );
}
