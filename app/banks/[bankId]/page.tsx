import Link from "next/link";
import { notFound } from "next/navigation";
import { interviewBanks } from "@/data/question-banks";
import { examTypeCategoryMap } from "@/data/question-pools/categories";
import { loadStructuredInterviewQuestions, type StructuredInterviewQuestion } from "@/data/question-pools/structured";
import { formatAnswerForDisplay } from "@/lib/formatAnswerForDisplay";

type BankPageProps = {
  params: Promise<{ bankId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type BankDisplayQuestion = Omit<StructuredInterviewQuestion, "examType" | "abilityTypes" | "jobTags" | "primaryType"> & {
  examType: StructuredInterviewQuestion["examType"] | "private-company";
  primaryType: string;
  abilityTypes: string[];
  jobTags: string[];
};

type FilterKey = "type" | "job" | "province" | "year" | "difficulty" | "round";

const examTypeIds = new Set(Object.keys(examTypeCategoryMap));
const getOne = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const unique = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).sort();
const defaultTypes = ["综合分析", "计划组织", "应急应变", "人际沟通", "岗位认知", "现场模拟", "演讲表达", "材料分析", "专业岗题", "无领导讨论"];
const filterLabels: Record<FilterKey, string> = {
  type: "题型",
  job: "岗位",
  province: "地区",
  year: "年份",
  difficulty: "难度",
  round: "轮次",
};
const difficultyLabels: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "较难",
};
const displayOption = (key: FilterKey, value: string) => key === "difficulty" ? difficultyLabels[value] ?? value : value;

export default async function BankPage({ params, searchParams }: BankPageProps) {
  const { bankId } = await params;
  const query = searchParams ? await searchParams : {};
  const allPool = await loadStructuredInterviewQuestions();
  const isExamType = examTypeIds.has(bankId);
  const bank = interviewBanks.find((item) => item.id === bankId);

  if (!isExamType && !bank) notFound();

  const sourceQuestions: BankDisplayQuestion[] = isExamType
    ? allPool.filter((q) => q.examType === bankId)
    : allPool.filter((q) => q.bankId === bankId);

  const builtInQuestions: BankDisplayQuestion[] = bank
    ? bank.questions.map((q, idx) => ({
        id: q.id,
        bankId,
        examType: "private-company",
        sourceTitle: bank.name,
        examDate: "",
        province: "",
        questionNo: String(idx + 1),
        question: q.question,
        primaryType: q.category ?? "综合分析",
        abilityTypes: q.category ? [q.category] : [],
        jobTags: [],
        difficulty: q.difficulty ?? "medium",
        round: q.round[0] ?? "综合",
        answerStatus: "pending",
      }))
    : [];

  const fallback: BankDisplayQuestion[] = !isExamType && sourceQuestions.length === 0 ? builtInQuestions : sourceQuestions;
  const keyword = getOne(query.keyword).trim().toLowerCase();
  const filters = {
    type: getOne(query.type) || "all",
    job: getOne(query.job) || "all",
    province: getOne(query.province) || "all",
    year: getOne(query.year) || "all",
    difficulty: getOne(query.difficulty) || "all",
    round: getOne(query.round) || "all",
  };
  const page = Math.max(Number(getOne(query.page) || "1") || 1, 1);

  const filtered = fallback.filter((q) => {
    const year = q.examDate?.slice(0, 4) || "";
    const abilityTypes: string[] = q.abilityTypes ?? [];
    const jobTags: string[] = q.jobTags ?? [];

    return (
      (!keyword || [q.question, q.sourceTitle, q.province, q.questionNo].join(" ").toLowerCase().includes(keyword)) &&
      (filters.type === "all" || q.primaryType === filters.type || abilityTypes.includes(filters.type)) &&
      (filters.job === "all" || jobTags.includes(filters.job)) &&
      (filters.province === "all" || q.province === filters.province) &&
      (filters.year === "all" || year === filters.year) &&
      (filters.difficulty === "all" || q.difficulty === filters.difficulty) &&
      (filters.round === "all" || q.round === filters.round)
    );
  });

  const pageSize = 20;
  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const items = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const provinces = unique(fallback.map((q) => q.province));
  const years = unique(fallback.map((q) => q.examDate?.slice(0, 4) || ""));
  const types = unique([...defaultTypes, ...fallback.flatMap((q) => [q.primaryType, ...q.abilityTypes])]);
  const jobs = unique(fallback.flatMap((q) => q.jobTags));
  const rounds = unique(fallback.map((q) => q.round));
  const difficultyOptions = unique(fallback.map((q) => q.difficulty));
  const title = isExamType ? examTypeCategoryMap[bankId as keyof typeof examTypeCategoryMap].name : bank?.name || bankId;
  const desc = isExamType ? examTypeCategoryMap[bankId as keyof typeof examTypeCategoryMap].description : bank?.description || "";
  const yearRange = years.length ? `${years[0]} - ${years[years.length - 1]}` : "-";
  const qstr = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries({ ...filters, keyword: keyword || "", page: String(p) }).forEach(([k, v]) => {
      if (v && v !== "all") sp.set(k, v);
    });
    return `/banks/${bankId}?${sp.toString()}`;
  };
  const getOptions = (key: FilterKey) => key === "type" ? types : key === "job" ? jobs : key === "province" ? provinces : key === "year" ? years : key === "difficulty" ? difficultyOptions : rounds;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white md:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/" className="text-sm text-slate-300">← 返回首页</Link>
        <header className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-slate-300">{desc}</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-5">
            <p>总题量：{fallback.length}</p>
            <p>覆盖省份：{provinces.length}</p>
            <p>年份范围：{yearRange}</p>
            <p>覆盖题型：{types.length}</p>
            <Link href={`/interview?bank=${bankId}`} className="text-cyan-300">开始模拟面试 →</Link>
          </div>
        </header>
        <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-4">
          <input name="keyword" defaultValue={keyword} placeholder="搜索题目、来源、地区、题号" className="rounded-lg bg-slate-900 px-3 py-2" />
          {(["type", "job", "province", "year", "difficulty", "round"] as const).map((k) => (
            <select key={k} name={k} defaultValue={filters[k]} className="rounded-lg bg-slate-900 px-3 py-2">
              <option value="all">全部{filterLabels[k]}</option>
              {getOptions(k).map((x) => (
                <option key={x} value={x}>{displayOption(k, x)}</option>
              ))}
            </select>
          ))}
          <button className="rounded-lg bg-cyan-500 px-3 py-2">筛选</button>
        </form>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-slate-300">没有符合条件的题目。</div>
        ) : (
          <div className="space-y-4">
            {items.map((q, idx) => {
              const displayNo = (currentPage - 1) * pageSize + idx + 1;
              return (
                <article key={q.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-base font-semibold">{displayNo}. {q.question}</p>
                  <p className="mt-1 text-sm text-slate-300">题型：{q.primaryType}｜能力：{q.abilityTypes.join("、") || "-"}｜岗位：{q.jobTags.join("、") || "-"}</p>
                  <p className="mt-1 text-xs text-slate-400">来源：{q.sourceTitle || "-"}｜日期：{q.examDate || "-"}｜地区：{q.province || "-"}｜难度：{difficultyLabels[q.difficulty] ?? q.difficulty ?? "-"}｜轮次：{q.round || "-"}</p>
                  {q.answerStatus === "pending" && <p className="mt-2 text-sm text-amber-300">参考答案暂未整理，可先使用 AI 模拟面试进行作答训练。</p>}
                  {q.answerStatus === "answered" && q.answer && (
                    <details className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-sm leading-7 text-slate-100">
                      <summary className="cursor-pointer font-semibold text-cyan-200">查看参考答案</summary>
                      <div className="mt-3 rounded-lg bg-slate-950/70 p-4">
                        <p className="whitespace-pre-line leading-8">{formatAnswerForDisplay(q.answer)}</p>
                      </div>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-between">
          <Link href={qstr(Math.max(currentPage - 1, 1))} className="rounded bg-white/10 px-3 py-2">上一页</Link>
          <span>{currentPage}/{totalPages}</span>
          <Link href={qstr(Math.min(currentPage + 1, totalPages))} className="rounded bg-white/10 px-3 py-2">下一页</Link>
        </div>
      </div>
    </main>
  );
}
