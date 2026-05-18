"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { InterviewBank } from "@/data/question-banks";

const accentStyles: Record<string, string> = {
  blue: "from-blue-500/20 to-cyan-400/10 border-blue-200/70",
  purple: "from-purple-500/20 to-indigo-400/10 border-purple-200/70",
  pink: "from-pink-500/20 to-purple-400/10 border-pink-200/70",
  orange: "from-orange-500/20 to-amber-400/10 border-orange-200/70",
  green: "from-emerald-500/20 to-green-400/10 border-emerald-200/70",
  cyan: "from-cyan-500/20 to-blue-400/10 border-cyan-200/70",
  indigo: "from-indigo-500/20 to-violet-400/10 border-indigo-200/70",
};

export default function BankExplorer({ banks }: { banks: InterviewBank[] }) {
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
      <div className="rounded-3xl border border-white/40 bg-white/60 p-4 backdrop-blur-xl md:p-5">
        <label className="text-sm font-medium text-slate-600">⌕ 搜索题库方向</label>
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="例如：产品、运营、英文" className="mt-2 w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-slate-900 outline-none ring-indigo-200 transition focus:ring" />
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-sm transition ${category === item ? "bg-slate-900 text-white" : "border border-white/60 bg-white/60 text-slate-700 hover:-translate-y-0.5"}`}>
            {item}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-indigo-200 bg-white/50 p-8 text-center text-slate-600">没有找到匹配的题库，可以换个关键词试试。</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((bank) => (
            <Link key={bank.id} href={`/banks/${bank.id}`} className={`group block rounded-3xl border bg-gradient-to-br ${accentStyles[bank.accentColor ?? "blue"] ?? accentStyles.blue} p-5 shadow-lg shadow-indigo-100/40 backdrop-blur-xl transition duration-300 hover:-translate-y-1.5 hover:shadow-xl`}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-3xl">{bank.icon}</span>
                {bank.badge ? <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-700">{bank.badge}</span> : null}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{bank.name}</h3>
              <p className="mt-2 text-sm text-slate-700">{bank.description}</p>
              <p className="mt-3 text-sm text-slate-700"><span className="font-medium">适合人群：</span>{bank.targetUsers}</p>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-700"><span>{bank.questions.length} 题</span><span className="font-medium text-indigo-700">查看题目 →</span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
