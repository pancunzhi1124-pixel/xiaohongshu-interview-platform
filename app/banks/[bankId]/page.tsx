import Link from "next/link";
import { notFound } from "next/navigation";
import { interviewBanks } from "@/data/question-banks";
import { examTypeCategoryMap } from "@/data/question-pools/categories";
import { loadStructuredInterviewQuestions, type StructuredInterviewQuestion } from "@/data/question-pools/structured";
import { formatAnswerForDisplay } from "@/lib/formatAnswerForDisplay";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import FloatingOrbs from "@/components/ui/FloatingOrbs";
import GlassCard from "@/components/ui/GlassCard";
import BankFilters from "@/components/banks/BankFilters";

type BankPageProps = {
  params: Promise<{ bankId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type BankDisplayQuestion = Omit<StructuredInterviewQuestion, "examType" | "abilityTypes" | "jobTags" | "primaryType"> & {
  examType: StructuredInterviewQuestion["examType"] | "private-company";
  primaryType: string;
  abilityTypes: string[];
  jobTags: string[];
  industry?: string;
  companyType?: string;
  company?: string;
  position?: string;
};

type PublicFilterKey = "type" | "job" | "province" | "year" | "difficulty" | "round";
type PrivateFilterKey = "industry" | "companyType" | "position" | "round" | "type" | "difficulty";

const examTypeIds = new Set(Object.keys(examTypeCategoryMap));
const getOne = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const unique = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).sort();
const defaultTypes = ["综合分析", "计划组织", "应急应变", "人际沟通", "岗位认知", "现场模拟", "演讲表达", "材料分析", "专业岗题", "无领导讨论"];
const difficultyLabels: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "较难",
};
const displayDifficulty = (value: string) => difficultyLabels[value] ?? value;

export default async function BankPage({ params, searchParams }: BankPageProps) {
  const { bankId } = await params;
  const query = searchParams ? await searchParams : {};
  const allPool = await loadStructuredInterviewQuestions();
  const isExamType = examTypeIds.has(bankId);
  const bank = interviewBanks.find((item) => item.id === bankId);
  const isPrivateCompany = bankId === "private-company";
  const isPrivateCompanyBank = bankId === "private-company";

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
        company: "",
        companyType: "",
        industry: "",
        position: "",
      }))
    : [];

  const fallback: BankDisplayQuestion[] = !isExamType && sourceQuestions.length === 0 ? builtInQuestions : sourceQuestions;
  const keyword = getOne(query.keyword).trim().toLowerCase();
  const page = Math.max(Number(getOne(query.page) || "1") || 1, 1);

  const publicFilters: Record<PublicFilterKey, string> = {
    type: getOne(query.type) || "all",
    job: getOne(query.job) || "all",
    province: getOne(query.province) || "all",
    year: getOne(query.year) || "all",
    difficulty: getOne(query.difficulty) || "all",
    round: getOne(query.round) || "all",
  };

  const privateFilters: Record<PrivateFilterKey, string> = {
    industry: getOne(query.industry) || "all",
    companyType: getOne(query.companyType) || "all",
    position: getOne(query.position) || "all",
    round: getOne(query.round) || "all",
    type: getOne(query.type) || "all",
    difficulty: getOne(query.difficulty) || "all",
  };

  const filtered = fallback.filter((q) => {
    const year = q.examDate?.slice(0, 4) || "";
    const abilityTypes: string[] = q.abilityTypes ?? [];
    const jobTags: string[] = q.jobTags ?? [];
    const company = q.company ?? "";
    const position = q.position ?? jobTags[0] ?? "";

    if (isPrivateCompany) {
      return (
        (!keyword || [q.question, q.sourceTitle, company, position, q.questionNo].join(" ").toLowerCase().includes(keyword)) &&
        (privateFilters.industry === "all" || q.industry === privateFilters.industry) &&
        (privateFilters.companyType === "all" || q.companyType === privateFilters.companyType) &&
        (privateFilters.position === "all" || position === privateFilters.position || jobTags.includes(privateFilters.position)) &&
        (privateFilters.round === "all" || q.round === privateFilters.round) &&
        (privateFilters.type === "all" || q.primaryType === privateFilters.type || abilityTypes.includes(privateFilters.type)) &&
        (privateFilters.difficulty === "all" || q.difficulty === privateFilters.difficulty)
      );
    }

    return (
      (!keyword || [q.question, q.sourceTitle, q.province, q.questionNo].join(" ").toLowerCase().includes(keyword)) &&
      (publicFilters.type === "all" || q.primaryType === publicFilters.type || abilityTypes.includes(publicFilters.type)) &&
      (publicFilters.job === "all" || jobTags.includes(publicFilters.job)) &&
      (publicFilters.province === "all" || q.province === publicFilters.province) &&
      (publicFilters.year === "all" || year === publicFilters.year) &&
      (publicFilters.difficulty === "all" || q.difficulty === publicFilters.difficulty) &&
      (publicFilters.round === "all" || q.round === publicFilters.round)
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
  const industries = unique(fallback.map((q) => q.industry ?? ""));
  const companyTypes = unique(fallback.map((q) => q.companyType ?? ""));
  const positions = unique(fallback.flatMap((q) => [q.position ?? "", ...(q.jobTags ?? [])]));
  const title = isExamType ? examTypeCategoryMap[bankId as keyof typeof examTypeCategoryMap].name : bank?.name || bankId;
  const desc = isExamType ? examTypeCategoryMap[bankId as keyof typeof examTypeCategoryMap].description : bank?.description || "";
  const yearRange = years.length ? `${years[0]} - ${years[years.length - 1]}` : "-";
  const qstr = (p: number) => {
    const sp = new URLSearchParams();
    const activeFilters = isPrivateCompany ? privateFilters : publicFilters;
    Object.entries({ ...activeFilters, keyword: keyword || "", page: String(p) }).forEach(([k, v]) => {
      if (v && v !== "all") sp.set(k, v);
    });
    return `/banks/${bankId}?${sp.toString()}`;
  };

  const hasActiveFilters = Object.values(isPrivateCompany ? privateFilters : publicFilters).some((v) => v !== "all") || Boolean(keyword);

  const publicOptionsMap: Record<string, { value: string; label: string }[]> = {
    type: [{ value: "all", label: "全部类型" }, ...types.map((x) => ({ value: x, label: x }))],
    job: [{ value: "all", label: "全部岗位" }, ...jobs.map((x) => ({ value: x, label: x }))],
    province: [{ value: "all", label: "全部地区" }, ...provinces.map((x) => ({ value: x, label: x }))],
    year: [{ value: "all", label: "全部年份" }, ...years.map((x) => ({ value: x, label: x }))],
    difficulty: [{ value: "all", label: "全部难度" }, ...difficultyOptions.map((x) => ({ value: x, label: displayDifficulty(x) }))],
    round: [{ value: "all", label: "全部批次" }, ...rounds.map((x) => ({ value: x, label: x }))],
  };

  const privateOptionsMap: Record<string, { value: string; label: string }[]> = {
    industry: [{ value: "all", label: "全部行业" }, ...industries.map((x) => ({ value: x, label: x }))],
    companyType: [{ value: "all", label: "全部公司类型" }, ...companyTypes.map((x) => ({ value: x, label: x }))],
    position: [{ value: "all", label: "全部岗位方向" }, ...positions.map((x) => ({ value: x, label: x }))],
    round: [{ value: "all", label: "全部面试轮次" }, ...rounds.map((x) => ({ value: x, label: x }))],
    type: [{ value: "all", label: "全部题型" }, ...types.map((x) => ({ value: x, label: x }))],
    difficulty: [{ value: "all", label: "全部难度" }, ...difficultyOptions.map((x) => ({ value: x, label: displayDifficulty(x) }))],
  };

  return (
    <main className="relative min-h-screen bg-slate-950 px-6 py-8 text-white md:px-10">
      <AnimatedBackground />
      <FloatingOrbs />
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/" className="text-sm text-slate-300">← 返回首页</Link>
        <GlassCard className="p-5">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-slate-300">{desc}</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-5">
            <p>总题量：{fallback.length}</p>
            <p>覆盖省份：{provinces.length}</p>
            <p>年份范围：{yearRange}</p>
            <p>覆盖题型：{types.length}</p>
            <Link href={`/interview?bank=${bankId}`} className="text-cyan-300">开始模拟面试 →</Link>
          </div>
        </GlassCard>
        <BankFilters
          bankId={bankId}
          isPrivateCompany={isPrivateCompany}
          keywordDefault={keyword}
          publicFilters={publicFilters}
          privateFilters={privateFilters}
          publicOptions={publicOptionsMap}
          privateOptions={privateOptionsMap}
        />
        {hasActiveFilters ? <div className="flex flex-wrap gap-2">{Object.entries(isPrivateCompany ? privateFilters : publicFilters).filter(([,v]) => v!=="all").map(([k,v]) => <span key={k} className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1 text-xs">{k}：{v}</span>)}{keyword ? <span className="rounded-full border border-purple-300/40 bg-purple-400/10 px-3 py-1 text-xs">关键词：{keyword}</span> : null}</div> : null}
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-slate-300">当前筛选条件较严格，建议重置筛选或减少筛选项。</div>
        ) : (
          <div className="space-y-4">
            {items.map((q, idx) => {
              const displayNo = (currentPage - 1) * pageSize + idx + 1;
              return (
                <article key={q.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-base font-semibold">{displayNo}. {q.question}</p>
                  <p className="mt-1 text-sm text-slate-300">题型：{q.primaryType}｜能力：{q.abilityTypes.join("、") || "-"}｜岗位：{q.jobTags.join("、") || q.position || "-"}</p>
                  <p className="mt-1 text-xs text-slate-400">来源：{q.sourceTitle || "-"}｜日期：{q.examDate || "-"}｜地区：{q.province || "-"}｜难度：{difficultyLabels[q.difficulty] ?? q.difficulty ?? "-"}{isPrivateCompanyBank && q.round ? <>｜轮次：{q.round}</> : null}</p>
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
