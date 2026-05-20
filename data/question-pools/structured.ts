import { promises as fs } from "node:fs";
import path from "node:path";
import { inferExamType, getExamTypeName, type ExamType } from "@/data/question-pools/categories";

export type StructuredInterviewQuestion = {
  id: string;
  bankId: string;
  sourceTitle: string;
  examDate: string;
  province: string;
  questionNo: string;
  question: string;
  primaryType: string;
  abilityTypes: string[];
  jobTags: string[];
  difficulty: string;
  round: string;
  answerStatus: string;
  examType?: ExamType;
  examTypeName?: string;
};

const primaryPath = path.join(process.cwd(), "data/question-pools/structured-interview-questions.json");
const fallbackPath = path.join(process.cwd(), "structured_interview_questions_categorized.json");

function normalize(items: unknown[]): StructuredInterviewQuestion[] {
  return items
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .filter((item) => typeof item.id === "string" && typeof item.question === "string")
    .map((item) => {
      const jobTags = Array.isArray(item.jobTags) ? item.jobTags.filter((x): x is string => typeof x === "string") : [];
      const abilityTypes = Array.isArray(item.abilityTypes) ? item.abilityTypes.filter((x): x is string => typeof x === "string") : [];
      const bankId = typeof item.bankId === "string" ? item.bankId : "private-company";
      const sourceTitle = typeof item.sourceTitle === "string" ? item.sourceTitle : "";
      const examType = inferExamType({ bankId, sourceTitle, jobTags });
      return {
        id: String(item.id),
        bankId,
        sourceTitle,
        examDate: typeof item.examDate === "string" ? item.examDate : "",
        province: typeof item.province === "string" ? item.province : "",
        questionNo: typeof item.questionNo === "string" ? item.questionNo : "",
        question: String(item.question),
        primaryType: typeof item.primaryType === "string" ? item.primaryType : "综合分析",
        abilityTypes,
        jobTags,
        difficulty: typeof item.difficulty === "string" ? item.difficulty : "medium",
        round: typeof item.round === "string" ? item.round : "all",
        answerStatus: typeof item.answerStatus === "string" ? item.answerStatus : "pending",
        examType,
        examTypeName: getExamTypeName(examType),
      };
    });
}

async function readPool(filePath: string): Promise<StructuredInterviewQuestion[]> {
  try {
    const file = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(file);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return normalize(parsed);
  } catch {
    return [];
  }
}

export async function loadStructuredInterviewQuestions(): Promise<StructuredInterviewQuestion[]> {
  const primary = await readPool(primaryPath);
  if (primary.length > 0) return primary;

  const fallback = await readPool(fallbackPath);
  if (fallback.length > 0) return fallback;

  return [];
}
