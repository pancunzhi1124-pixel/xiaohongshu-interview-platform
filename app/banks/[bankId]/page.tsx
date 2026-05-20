import Link from "next/link";
import { notFound } from "next/navigation";
import { examTypeCategories } from "@/data/question-pools/categories";
import { interviewBanks } from "@/data/question-banks";
import { loadStructuredInterviewQuestions } from "@/data/question-pools/structured";

type Props = { params: Promise<{ bankId: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };
const get = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const getYear = (d: string) => d.match(/(19|20)\d{2}/)?.[0] ?? "";

const difficultyLabels: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "较难",
};

const roundLabels: Record<string, string> = {
  all: "综合",
  general: "综合",
  hr: "HR 初面",
  business: "业务面",
  manager: "主管面",
  final: "终面",
  stress: "压力面",
  english: "英文面试",
  "综合": "综合",
  "HR": "HR 初面",
  "业务": "业务面",
  "主管": "主管面",
  "终面": "终面",
  "压力": "压力面",
  "英文": "英文面试",
};

const answerStatusLabels: Record<string, string> = {
  pending: "参考答案暂未整理",
  ready: "已整理",
  done: "已整理",
  completed: "已整理",
};

function labelDifficulty(value: string) {
  return difficultyLabels[value] ?? value ?? "普通";
}

function labelRound(value: string) {
  return roundLabels[value] ?? value ?? "综合";
}

function labelAnswerStatus(value: string) {
  return answerStatusLabels[value] ?? value ?? "参考答案暂未整理";
}

export default async function Page({ params, searchParams }: Props) {
  const { bankId } = await params;
  const examCat = examTypeCategories.find((x) => x.id === bankId);
  const bank = interviewBanks.find((x) => x.id === bankId);
  if (!examCat && !bank) notFound();

  const sp = (await searchParams) ?? {};
  const keyword = get(sp.keyword).trim();
  const type = get(sp.type) || "all";
  const job = get(sp.job) || "all";
  const province = get(sp.province) || "all";
  const year = get(sp.year) || "all";
  const difficulty = get(sp.difficulty) || "all";
  const round = get(sp.round) || "all";
  const page = Math.max(Number(get(sp.page) || "1") || 1, 1);

  const all = await loadStructuredInterviewQuestions();
  let source = examCat ? all.filter((q) => q.examType === bankId) : all.filter((q) => q.bankId === bankId);
  if (source.length === 0 && bank) source = bank.questions.map((q, i) => ({ id: q.id, bankId: bank.id, sourceTitle: bank.name, examDate: "", province: "", questionNo: String(i + 1), question: q.question, primaryType: q.category ?? "综合", abilityTypes: q.category ? [q.category] : [], jobTags: [], difficulty: q.difficulty ?? "medium", round: q.round[0] ?? "all", answerStatus: "pending" }));

  const filtered = source.filter((q) => (!keyword || [q.question, q.sourceTitle, q.province, q.questionNo].join(" ").includes(keyword)) && (type === "all" || q.primaryType === type || q.abilityTypes.includes(type)) && (job === "all" || q.jobTags.includes(job)) && (province === "all" || q.province === province) && (year === "all" || getYear(q.examDate) === year) && (difficulty === "all" || q.difficulty === difficulty) && (round === "all" || q.round === round));

  const pageSize = 20;
  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const items = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const types = Array.from(new Set(source.flatMap((x) => [x.primaryType, ...x.abilityTypes]).filter(Boolean)));
  const jobs = Array.from(new Set(source.flatMap((x) => x.jobTags).filter(Boolean)));
  const provinces = Array.from(new Set(source.map((x) => x.province).filter(Boolean)));
  const years = Array.from(new Set(source.map((x) => getYear(x.examDate)).filter(Boolean)));

  const build = (p: number) => {
    const qs = new URLSearchParams();
    [["keyword", keyword], ["type", type], ["job", job], ["province", province], ["year", year], ["difficulty", difficulty], ["round", round]].forEach(([k, v]) => {
      if (v && v !== "all") qs.set(k, v);
    });
    qs.set("page", String(p));
    return `/banks/${bankId}?${qs.toString()}`;
  };

  return <main className="min-h-screen bg-slate-950 px-6 py-8 text-white md:px-10"><div className="mx-auto max-w-6xl space-y-6"><Link href="/">← 返回首页</Link><h1 className="text-3xl font-bold">{examCat?.name ?? bank?.name}（{filtered.length}题）</h1><p className="text-slate-300">{examCat?.description ?? bank?.description}</p><div className="grid gap-3 md:grid-cols-4"><div>总题量：{source.length}</div><div>覆盖地区：{provinces.length}</div><div>年份范围：{years[0] ?? "-"} - {years[years.length-1] ?? "-"}</div><div>题型数：{types.length}</div></div><Link className="inline-block rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-4 py-2" href={`/interview?bank=${bankId}`}>开始模拟面试</Link>
<form className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-4"><input name="keyword" defaultValue={keyword} placeholder="关键词" className="rounded bg-slate-900 px-3 py-2"/><select name="type" defaultValue={type} className="rounded bg-slate-900 px-2 py-2"><option value="all">全部题型</option>{types.map(x=><option key={x}>{x}</option>)}</select><select name="job" defaultValue={job} className="rounded bg-slate-900 px-2 py-2"><option value="all">全部岗位</option>{jobs.map(x=><option key={x}>{x}</option>)}</select><select name="province" defaultValue={province} className="rounded bg-slate-900 px-2 py-2"><option value="all">全部地区</option>{provinces.map(x=><option key={x}>{x}</option>)}</select><select name="year" defaultValue={year} className="rounded bg-slate-900 px-2 py-2"><option value="all">全部年份</option>{years.map(x=><option key={x}>{x}</option>)}</select><select name="difficulty" defaultValue={difficulty} className="rounded bg-slate-900 px-2 py-2"><option value="all">全部难度</option>{["easy","medium","hard"].map(x=><option key={x} value={x}>{labelDifficulty(x)}</option>)}</select><select name="round" defaultValue={round} className="rounded bg-slate-900 px-2 py-2"><option value="all">全部轮次</option>{["hr","business","manager","final","stress","english"].map(x=><option key={x} value={x}>{labelRound(x)}</option>)}</select><button className="rounded bg-cyan-500 px-3 py-2">筛选</button></form>
{items.length===0?<div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-slate-300">暂无题目。请确认结构化题库 JSON 已放入 data/question-pools/structured-interview-questions.json，或已合并包含 structured_interview_questions_categorized.json 的题库分支。</div>:<div className="space-y-3">{items.map(q=><article key={q.id} className="rounded-2xl border border-white/10 bg-white/5 p-4"><p>{q.questionNo} {q.question}</p><p className="text-sm text-slate-300">{q.primaryType} | {q.abilityTypes.join("、") || "-"} | {q.jobTags.join("、") || "-"}</p><p className="text-xs text-slate-400">来源：{q.sourceTitle || "未标注"}　日期：{q.examDate || "未标注"}　地区：{q.province || "未标注"}　难度：{labelDifficulty(q.difficulty)}　轮次：{labelRound(q.round)}　状态：{labelAnswerStatus(q.answerStatus)}</p>{q.answerStatus==="pending"?<p className="text-amber-300">参考答案暂未整理，可先使用 AI 模拟面试进行作答训练。</p>:null}</article>)}</div>}
<div className="flex justify-between"><Link href={build(Math.max(1,currentPage-1))}>上一页</Link><span>{currentPage}/{totalPages}</span><Link href={build(Math.min(totalPages,currentPage+1))}>下一页</Link></div></div></main>;
}