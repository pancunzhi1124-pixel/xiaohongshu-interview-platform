import { NextResponse } from "next/server";
import { loadStructuredInterviewQuestions } from "@/data/question-pools/structured";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bankId = searchParams.get("bankId") ?? "";
  const examType = searchParams.get("examType") ?? "";
  const keyword = (searchParams.get("keyword") ?? "").trim().toLowerCase();
  const type = searchParams.get("type") ?? "all";
  const job = searchParams.get("job") ?? "all";
  const province = searchParams.get("province") ?? "all";
  const year = searchParams.get("year") ?? "all";
  const difficulty = searchParams.get("difficulty") ?? "all";
  const round = searchParams.get("round") ?? "all";
  const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
  const pageSize = Math.max(Number(searchParams.get("pageSize") ?? "20") || 20, 1);
  const countOnly = searchParams.get("countOnly") === "true";

  const filtered = (await loadStructuredInterviewQuestions()).filter((item) => {
    const hitBank = !bankId || item.bankId === bankId || item.examType === bankId;
    const hitExam = !examType || item.examType === examType;
    const hitKeyword = !keyword || [item.question, item.sourceTitle, item.province, item.questionNo].join(" ").toLowerCase().includes(keyword);
    const hitType = type === "all" || item.primaryType === type || item.abilityTypes.includes(type);
    const hitJob = job === "all" || item.jobTags.includes(job);
    const hitProvince = province === "all" || item.province === province;
    const hitYear = year === "all" || item.examDate.slice(0, 4) === year;
    const hitDifficulty = difficulty === "all" || item.difficulty === difficulty;
    const hitRound = round === "all" || item.round === round;
    return hitBank && hitExam && hitKeyword && hitType && hitJob && hitProvince && hitYear && hitDifficulty && hitRound;
  });

  if (countOnly) return NextResponse.json({ total: filtered.length });
  const total = filtered.length; const totalPages = Math.max(Math.ceil(total / pageSize), 1); const currentPage = Math.min(page, totalPages);
  return NextResponse.json({ questions: filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), total, page: currentPage, pageSize, totalPages, filters: { bankId, examType, keyword: searchParams.get("keyword") ?? "", type, job, province, year, difficulty, round } });
}
