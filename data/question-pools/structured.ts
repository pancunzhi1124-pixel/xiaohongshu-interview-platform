import { promises as fs } from "node:fs";
import path from "node:path";

export type ExamType = "national-civil-service" | "provincial-civil-service" | "public-institution" | "state-owned-enterprise" | "private-company";

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
  answerStatus: string;
};

const primaryStructuredPoolPath = path.join(process.cwd(), "data/question-pools/structured-interview-questions.json");
const fallbackStructuredPoolPath = path.join(process.cwd(), "structured_interview_questions_categorized.json");

const roundMap: Record<string, string> = { hr: "HR", business: "业务", manager: "主管", final: "终面", stress: "压力", english: "英文", all: "综合", general: "综合", unknown: "综合" };

function containsAny(text: string, keys: string[]) { return keys.some((k) => text.includes(k)); }

function inferExamType(raw: Record<string, unknown>): ExamType {
  const bankId = String(raw.bankId ?? "").toLowerCase();
  const text = [raw.sourceTitle, ...(Array.isArray(raw.jobTags) ? raw.jobTags : [raw.jobTags])].filter(Boolean).join(" ").toLowerCase();

  if (bankId === "national-civil-service" || containsAny(text, ["国考", "国家公务员", "中央机关", "税务系统", "海关", "边检", "公安系统", "国家部委"])) return "national-civil-service";
  if (bankId === "provincial-civil-service" || (containsAny(text, ["省考", "公务员", "选调", "定向选调", "省直", "市直", "县区公务员"]) && !containsAny(text, ["国考", "国家公务员", "中央机关"]))) return "provincial-civil-service";
  if (bankId === "public-institution" || containsAny(text, ["事业单位", "事业编", "社区工作者", "社工", "教师岗", "医疗卫生岗", "高校辅导员", "高校管理岗", "乡镇基层岗"])) return "public-institution";
  if (bankId === "state-owned-enterprise" || containsAny(text, ["国企", "央企", "银行", "国家电网", "电力系统", "烟草", "铁路", "移动", "联通", "电信"])) return "state-owned-enterprise";
  if (bankId === "private-company" || containsAny(text, ["私企", "民企", "企业招聘", "互联网", "运营", "电商", "销售", "客服", "产品", "技术", "数据分析", "财务", "人事"])) return "private-company";
  return "private-company";
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
    .map((item) => ({
      id: String(item.id),
      bankId: String(item.bankId ?? inferExamType(item)),
      examType: (item.examType ? String(item.examType) : inferExamType(item)) as ExamType,
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
      answerStatus: String(item.answerStatus ?? "pending"),
    }));
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
