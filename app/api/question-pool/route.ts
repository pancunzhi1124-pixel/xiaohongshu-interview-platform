import { NextResponse } from "next/server";
import { loadStructuredInterviewQuestions } from "@/data/question-pools/structured";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bankId = searchParams.get("bankId") ?? "";
  const keyword = (searchParams.get("keyword") ?? "").trim().toLowerCase();
  const type = searchParams.get("type") ?? "all";
  const job = searchParams.get("job") ?? "all";
  const round = searchParams.get("round") ?? "all";
  const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
  const pageSize = Math.max(Number(searchParams.get("pageSize") ?? "20") || 20, 1);
  const countOnly = searchParams.get("countOnly") === "true";

  const allQuestions = await loadStructuredInterviewQuestions();
  const filtered = allQuestions.filter((item) => {
    const hitBank = !bankId || item.bankId === bankId;
    const hitKeyword = !keyword || [item.question, item.sourceTitle, item.province, item.questionNo].join(" ").toLowerCase().includes(keyword);
    const hitType = type === "all" || item.primaryType === type || item.abilityTypes.includes(type);
    const hitJob = job === "all" || item.jobTags.includes(job);
    const hitRound = round === "all" || item.round === round;
    return hitBank && hitKeyword && hitType && hitJob && hitRound;
  });

  if (countOnly) {
    return NextResponse.json({ total: filtered.length });
  }

  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const questions = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return NextResponse.json({
    questions,
    total,
    page: currentPage,
    pageSize,
    totalPages,
  });
}
