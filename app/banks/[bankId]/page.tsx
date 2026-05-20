import Link from "next/link";
import { notFound } from "next/navigation";
import { interviewBanks } from "@/data/question-banks";
import { loadStructuredInterviewQuestions, type StructuredInterviewQuestion } from "@/data/question-pools/structured";

type BankPageProps = {
  params: Promise<{ bankId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const abilityFilters = ["综合分析", "计划组织", "人际关系", "应急应变", "基层治理", "群众工作", "执法情景", "岗位认知"];
const jobFilters = ["综合管理岗", "乡镇基层岗", "社区工作者", "社工岗", "教师岗", "高校辅导员", "高校管理岗", "医疗卫生岗", "农业农村岗", "林草/生态环保岗", "应急管理岗", "税务系统", "海关/边检/公安系统", "银行系统", "国家电网/电力系统", "国企央企通用岗", "文旅宣传岗", "窗口服务岗", "村干部/驻村干部", "人才引进综合岗"];

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function generateStaticParams() {
  return interviewBanks.map((bank) => ({ bankId: bank.id }));
}

export default async function BankPage({ params, searchParams }: BankPageProps) {
  const { bankId } = await params;
  const bank = interviewBanks.find((item) => item.id === bankId);
  if (!bank) notFound();

  const allPool = await loadStructuredInterviewQuestions();
  const structured = allPool.filter((q) => q.bankId === bankId);
  const query = searchParams ? await searchParams : {};
  const keyword = getSingleParam(query.keyword)?.trim() ?? "";
  const typeFilter = getSingleParam(query.type) ?? "all";
  const jobFilter = getSingleParam(query.job) ?? "all";
  const page = Math.max(Number(getSingleParam(query.page) ?? "1") || 1, 1);

  const sourceQuestions: StructuredInterviewQuestion[] = structured.length > 0 ? structured : bank.questions.map((q, idx) => ({ id: q.id, bankId, sourceTitle: bank.name, examDate: "", province: "", questionNo: String(idx + 1), question: q.question, primaryType: q.category ?? "综合分析", abilityTypes: q.category ? [q.category] : [], jobTags: [], difficulty: q.difficulty ?? "medium", round: q.round[0] ?? "综合", answerStatus: "pending" }));

  const filtered = sourceQuestions.filter((q) => (!keyword || q.question.includes(keyword) || q.sourceTitle.includes(keyword)) && (typeFilter === "all" || q.primaryType === typeFilter || q.abilityTypes.includes(typeFilter)) && (jobFilter === "all" || q.jobTags.includes(jobFilter)));

  const pageSize = 20;
  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const currentItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (jobFilter !== "all") params.set("job", jobFilter);
    params.set("page", String(nextPage));
    return `/banks/${bankId}?${params.toString()}`;
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white md:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/" className="text-sm text-slate-300">← 返回首页</Link>
        <h1 className="text-3xl font-bold">{bank.name}（共 {filtered.length} 题）</h1>
        <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-4">
          <input name="keyword" defaultValue={keyword} placeholder="搜索题目/来源" className="rounded-lg bg-slate-900 px-3 py-2" />
          <select name="type" defaultValue={typeFilter} className="rounded-lg bg-slate-900 px-3 py-2"><option value="all">全部题型/能力</option>{abilityFilters.map((x) => <option key={x} value={x}>{x}</option>)}</select>
          <select name="job" defaultValue={jobFilter} className="rounded-lg bg-slate-900 px-3 py-2"><option value="all">全部岗位/系统</option>{jobFilters.map((x) => <option key={x} value={x}>{x}</option>)}</select>
          <button className="rounded-lg bg-cyan-500 px-3 py-2">筛选</button>
        </form>
        <div className="grid gap-3 md:grid-cols-4">{abilityFilters.map((x) => <div key={x} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">{x}</div>)}</div>
        <div className="grid gap-3 md:grid-cols-4">{jobFilters.map((x) => <div key={x} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">{x}</div>)}</div>
        <div className="space-y-3">{currentItems.map((q) => <article key={q.id} className="rounded-2xl border border-white/10 bg-white/5 p-4"><p>{q.questionNo}. {q.question}</p><p className="mt-2 text-sm text-slate-300">{q.primaryType} | {q.abilityTypes.join("、") || "-"} | {q.jobTags.join("、") || "-"}</p><p className="text-xs text-slate-400">{q.sourceTitle} {q.examDate} {q.province} 难度：{q.difficulty}</p>{q.answerStatus === "pending" ? <p className="mt-2 text-sm text-amber-300">参考答案暂未整理，可先使用 AI 模拟面试进行作答训练。</p> : null}</article>)}</div>
        <div className="flex items-center justify-between"><Link href={buildHref(Math.max(currentPage - 1, 1))} className="rounded bg-white/10 px-3 py-2">上一页</Link><span>{currentPage}/{totalPages}</span><Link href={buildHref(Math.min(currentPage + 1, totalPages))} className="rounded bg-white/10 px-3 py-2">下一页</Link></div>
      </div>
    </main>
  );
}
