import { NextResponse } from "next/server";
import { examTypeCategories, type ExamType } from "@/data/question-pools/categories";
import { loadStructuredInterviewQuestions } from "@/data/question-pools/structured";

const EXAM_TYPES = new Set(examTypeCategories.map((x) => x.id));

const getYear = (date: string) => {
  const match = date.match(/(19|20)\d{2}/);
  return match?.[0] ?? "";
};

const toArr = (items: string[]) => Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bankId = searchParams.get("bankId")?.trim() ?? "";
  const examType = searchParams.get("examType")?.trim() ?? "";
  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const type = searchParams.get("type")?.trim() ?? "";
  const job = searchParams.get("job")?.trim() ?? "";
  const province = searchParams.get("province")?.trim() ?? "";
  const year = searchParams.get("year")?.trim() ?? "";
  const difficulty = searchParams.get("difficulty")?.trim() ?? "";
  const round = searchParams.get("round")?.trim() ?? "";
  const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
  const pageSize = Math.max(Number(searchParams.get("pageSize") ?? "20") || 20, 1);
  const countOnly = searchParams.get("countOnly") === "true";

  let items = await loadStructuredInterviewQuestions();

  const resolvedExamType = (examType || (EXAM_TYPES.has(bankId as ExamType) ? bankId : "")) as ExamType | "";
  if (resolvedExamType) items = items.filter((q) => q.examType === resolvedExamType);
  else if (bankId) items = items.filter((q) => q.bankId === bankId);

  if (keyword) {
    const q = keyword.toLowerCase();
    items = items.filter((item) => [item.question, item.sourceTitle, item.province, item.questionNo].join(" ").toLowerCase().includes(q));
  }
  if (type) items = items.filter((q) => q.primaryType === type || q.abilityTypes.includes(type));
  if (job) items = items.filter((q) => q.jobTags.includes(job));
  if (province) items = items.filter((q) => q.province === province);
  if (year) items = items.filter((q) => getYear(q.examDate) === year);
  if (difficulty) items = items.filter((q) => q.difficulty === difficulty);
  if (round) items = items.filter((q) => q.round === round);

  if (countOnly) return NextResponse.json({ total: items.length });

  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const questions = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return NextResponse.json({
    questions,
    total,
    page: currentPage,
    pageSize,
    totalPages,
    filters: {
      types: toArr(items.flatMap((x) => [x.primaryType, ...x.abilityTypes])),
      jobs: toArr(items.flatMap((x) => x.jobTags)),
      provinces: toArr(items.map((x) => x.province)),
      years: toArr(items.map((x) => getYear(x.examDate))),
      difficulties: toArr(items.map((x) => x.difficulty)),
      rounds: toArr(items.map((x) => x.round)),
    },
  });
}
