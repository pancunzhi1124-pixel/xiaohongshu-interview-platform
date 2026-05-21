import { promises as fs } from "node:fs";
import path from "node:path";

export type ExamType = "national-civil-service" | "provincial-civil-service" | "public-institution" | "state-owned-enterprise";

const allowedExamTypes = new Set<ExamType>([
  "national-civil-service",
  "provincial-civil-service",
  "public-institution",
  "state-owned-enterprise",
]);

export type StructuredInterviewQuestion = {
  id: string;
  bankId: string;
  examType: ExamType;
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
  answer?: string;
  answerStatus: string;
};

const primaryStructuredPoolPath = path.join(process.cwd(), "data/question-pools/structured-interview-questions.json");
const fallbackStructuredPoolPath = path.join(process.cwd(), "structured_interview_questions_categorized.json");

const roundMap: Record<string, string> = { hr: "HR", business: "业务", manager: "主管", final: "终面", stress: "压力", english: "英文", all: "综合", general: "综合", unknown: "综合" };

function containsAny(text: string, keys: string[]) { return keys.some((k) => text.includes(k)); }

function inferExamType(raw: Record<string, unknown>): ExamType {
  const bankId = String(raw.bankId ?? "").toLowerCase();
  const text = [raw.sourceTitle, raw.question, ...(Array.isArray(raw.jobTags) ? raw.jobTags : [raw.jobTags])].filter(Boolean).join(" ").toLowerCase();

  if (bankId === "national-civil-service" || containsAny(text, ["国考", "国家公务员", "中央机关", "税务系统", "税务局", "国税", "海关", "边检", "铁路公安", "公安系统", "国家部委"])) return "national-civil-service";
  if (bankId === "provincial-civil-service" || (containsAny(text, ["省考", "公务员", "选调", "定向选调", "省直", "市直", "县区公务员", "市考", "遴选"]) && !containsAny(text, ["国考", "国家公务员", "中央机关"]))) return "provincial-civil-service";
  if (bankId === "state-owned-enterprise" || containsAny(text, ["国企", "央企", "银行", "农商", "国家电网", "国网", "电力系统", "烟草", "铁路", "移动", "联通", "电信", "国资", "有限公司"])) return "state-owned-enterprise";
  return "public-institution";
}

function normalizeExamType(item: Record<string, unknown>): ExamType {
  const rawExamType = String(item.examType ?? item.bankId ?? "");
  if (allowedExamTypes.has(rawExamType as ExamType)) return rawExamType as ExamType;
  return inferExamType(item);
}

function normalizeRound(round: unknown): string {
  const key = String(round ?? "").trim().toLowerCase();
  if (!key) return "综合";
  return roundMap[key] ?? String(round);
}

function normalizeStructuredQuestions(parsed: unknown): StructuredInterviewQuestion[] {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .filter((item) => typeof item.id === "string" && typeof item.question === "string")
    .map((item) => {
      const examType = normalizeExamType(item);
      const answer = typeof item.answer === "string" ? item.answer : "";
      return {
        id: String(item.id),
        bankId: allowedExamTypes.has(String(item.bankId ?? "") as ExamType) ? String(item.bankId) : examType,
        examType,
        sourceTitle: String(item.sourceTitle ?? ""),
        examDate: String(item.examDate ?? ""),
        province: String(item.province ?? ""),
        questionNo: String(item.questionNo ?? ""),
        question: String(item.question ?? ""),
        primaryType: String(item.primaryType ?? "综合分析"),
        abilityTypes: Array.isArray(item.abilityTypes) ? item.abilityTypes.map(String) : [],
        jobTags: Array.isArray(item.jobTags) ? item.jobTags.map(String) : [],
        difficulty: String(item.difficulty ?? "medium"),
        round: normalizeRound(item.round),
        answer,
        answerStatus: String(item.answerStatus ?? (answer ? "answered" : "pending")),
      };
    })
    .filter((item) => allowedExamTypes.has(item.examType));
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
  const fallback = await readStructuredFile(fallbackStructuredPoolPath);
  if (fallback.length > 0) return fallback;
  return [];
}
