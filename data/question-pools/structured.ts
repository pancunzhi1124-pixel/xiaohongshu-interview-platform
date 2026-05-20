import { promises as fs } from "node:fs";
import path from "node:path";

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
};

const primaryStructuredPoolPath = path.join(process.cwd(), "data/question-pools/structured-interview-questions.json");
const fallbackStructuredPoolPath = path.join(process.cwd(), "structured_interview_questions_categorized.json");

function normalizeStructuredQuestions(parsed: unknown): StructuredInterviewQuestion[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is StructuredInterviewQuestion => typeof item?.id === "string" && typeof item?.question === "string" && typeof item?.bankId === "string");
}

async function readStructuredFile(filePath: string): Promise<StructuredInterviewQuestion[]> {
  try {
    const file = await fs.readFile(filePath, "utf8");
    return normalizeStructuredQuestions(JSON.parse(file));
  } catch {
    return [];
  }
}

export async function loadStructuredInterviewQuestions(): Promise<StructuredInterviewQuestion[]> {
  const primary = await readStructuredFile(primaryStructuredPoolPath);
  if (primary.length > 0) return primary;
  return readStructuredFile(fallbackStructuredPoolPath);
}
