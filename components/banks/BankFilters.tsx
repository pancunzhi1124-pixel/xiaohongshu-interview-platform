"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SmartSelect from "@/components/ui/SmartSelect";

type Option = { value: string; label: string };

type BankFiltersProps = {
  bankId: string;
  isPrivateCompany: boolean;
  keywordDefault: string;
  publicFilters: Record<string, string>;
  privateFilters: Record<string, string>;
  publicOptions: Record<string, Option[]>;
  privateOptions: Record<string, Option[]>;
};

export default function BankFilters(props: BankFiltersProps) {
  const { bankId, isPrivateCompany, keywordDefault, publicFilters, privateFilters, publicOptions, privateOptions } = props;
  const router = useRouter();
  const [keyword, setKeyword] = useState(keywordDefault);
  const [pub, setPub] = useState(publicFilters);
  const [pri, setPri] = useState(privateFilters);
  const active = isPrivateCompany ? pri : pub;
  const options = isPrivateCompany ? privateOptions : publicOptions;

  const handleSubmit = () => {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("keyword", keyword.trim());
    Object.entries(active).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
    });
    router.push(`/banks/${bankId}?${params.toString()}`);
  };

  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-3 xl:grid-cols-4">
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={isPrivateCompany ? "搜索公司、岗位、题目关键词" : "搜索题目、来源、地区、题号"} className="h-11 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 focus:border-cyan-300" />
      {Object.keys(active).map((k) => (
        <SmartSelect
          key={k}
          value={active[k]}
          onChange={(next) => (isPrivateCompany ? setPri((prev) => ({ ...prev, [k]: next })) : setPub((prev) => ({ ...prev, [k]: next })))}
          options={options[k] ?? []}
          placeholder={(options[k]?.[0]?.label) ?? "请选择"}
          searchable={(options[k]?.length ?? 0) > 8}
        />
      ))}
      <button type="button" onClick={handleSubmit} className="h-11 rounded-2xl bg-cyan-500 px-3 py-2 transition hover:bg-cyan-400">应用筛选</button>
      <Link href={`/banks/${bankId}`} className="h-11 rounded-2xl border border-white/20 bg-white/5 px-3 py-2 text-center text-sm leading-7 text-slate-200 hover:bg-white/10">重置筛选</Link>
    </div>
  );
}
