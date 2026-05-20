import { NextResponse } from "next/server";
import { loadStructuredInterviewQuestions } from "@/data/question-pools/structured";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bankId = searchParams.get("bankId");
  const allQuestions = await loadStructuredInterviewQuestions();
  const questions = bankId ? allQuestions.filter((item) => item.bankId === bankId) : allQuestions;
  return NextResponse.json({ questions });
}
