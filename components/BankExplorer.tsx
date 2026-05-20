"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { InterviewBank } from "@/data/question-banks";

const accentStyles: Record<string, string> = {
  blue: "from-blue-500/25 to-cyan-500/10",
  purple: "from-purple-500/25 to-indigo-500/10",
  pink: "from-pink-500/25 to-purple-500/10",
  orange: "from-orange-500/25 to-amber-500/10",
  green: "from-emerald-500/25 to-green-500/10",
  cyan: "from-cyan-500/25 to-blue-500/10",
  indigo: "from-indigo-500/25 to-violet-500/10",
};

export default function BankExplorer({ banks, questionCounts }: { banks: InterviewBank[]; questionCounts?: Record<string, number> }) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("全部");

  const categories = useMemo(() => ["全部", ...Array.from(new Set(banks.map((b) => b.category)))], [banks]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return banks.filter((bank) => {
      const hitCategory = category === "全部" || bank.category === category;
      const hitQuery = !q || [bank.name, bank.description, bank.targetUsers, bank.category].join(" ").toLowerCase().includes(q);
      return hitCategory && hitQuery;
    });
  }, [banks, category, keyword]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl md:p-5">
        <label className="text-sm font-medium text-slate-300">⌕ 搜索题库方向</label>
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="例如：产品、运营、英文" className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/30" />
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <button key={item} onClick={() => setCategory(item)} className={`rounded-full border px-4 py-2 text-sm transition duration-300 ${category === item ? "border-white bg-white text-slate-950" : "border-white/10 bg-white/5 text-slate-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/10"}`}>
            {item}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-slate-300">没有找到匹配的题库，可以换个关键词试试。</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((bank) => (
            <Link key={bank.id} href={`/banks/${bank.id}`} className={`group block rounded-3xl border border-white/10 bg-gradient-to-br ${accentStyles[bank.accentColor ?? "blue"] ?? accentStyles.blue} p-5 shadow-2xl backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/10`}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-3xl">{bank.icon}</span>
                {bank.badge ? <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-medium text-white">{bank.badge}</span> : null}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{bank.name}</h3>
              <p className="mt-2 text-sm text-slate-300">{bank.description}</p>
              <p className="mt-3 text-sm text-slate-400"><span className="font-medium">适合人群：</span>{bank.targetUsers}</p>
              <div className="mt-4 flex items-center justify-between text-sm"><span className="text-cyan-300">{questionCounts?.[bank.id] ?? bank.questions.length} 题</span><span className="font-medium text-blue-300">查看题目 →</span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
