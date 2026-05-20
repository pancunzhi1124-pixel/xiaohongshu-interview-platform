import Link from "next/link";
import type { ExamType } from "@/data/question-pools/categories";

type Entry = {
  id: ExamType;
  name: string;
  description: string;
  icon: string;
  path: string;
  count: number;
};

const accentStyles: Record<string, string> = {
  blue: "from-blue-500/25 to-cyan-500/10",
  purple: "from-purple-500/25 to-indigo-500/10",
  green: "from-emerald-500/25 to-green-500/10",
  cyan: "from-cyan-500/25 to-blue-500/10",
  orange: "from-orange-500/25 to-amber-500/10",
};

export default function BankExplorer({ entries }: { entries: Entry[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map((bank) => (
        <Link key={bank.id} href={bank.path} className={`group block rounded-3xl border border-white/10 bg-gradient-to-br ${accentStyles[bank.id.includes("private") ? "orange" : bank.id.includes("state") ? "green" : bank.id.includes("public") ? "purple" : bank.id.includes("provincial") ? "cyan" : "blue"]} p-5 shadow-2xl backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40`}>
          <span className="text-3xl">{bank.icon}</span>
          <h3 className="mt-4 text-lg font-semibold text-white">{bank.name}</h3>
          <p className="mt-2 text-sm text-slate-300">{bank.description}</p>
          <div className="mt-4 flex items-center justify-between text-sm"><span className="text-cyan-300">{bank.count > 0 ? `${bank.count} 题` : "建设中"}</span><span className="font-medium text-blue-300">查看题目 →</span></div>
        </Link>
      ))}
    </div>
  );
}
