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

const structuredPoolPath = path.join(process.cwd(), "data/question-pools/structured-interview-questions.json");

export async function loadStructuredInterviewQuestions(): Promise<StructuredInterviewQuestion[]> {
  try {
    const file = await fs.readFile(structuredPoolPath, "utf8");
    const parsed = JSON.parse(file);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StructuredInterviewQuestion => typeof item?.id === "string" && typeof item?.question === "string" && typeof item?.bankId === "string");
  } catch {
    return [];
  }
}
