import { promises as fs } from "node:fs";
import path from "node:path";
import { inferExamType, getExamTypeName, type ExamType } from "@/data/question-pools/categories";

export type AnswerSource = "manual" | "ai_generated" | "mixed";
export type AnswerStatus = "pending" | "reviewing" | "ready";

export type StructuredQuestionAnswer = {
  answerStatus?: AnswerStatus;
  answerOutline?: string[];
  keyPoints?: string[];
  sampleAnswer?: string;
  scoringRubric?: string;
  answerSource?: AnswerSource;
  answerUpdatedAt?: string;
};

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
  answerStatus: AnswerStatus;
  answerOutline?: string[];
  keyPoints?: string[];
  sampleAnswer?: string;
  scoringRubric?: string;
  answerSource?: AnswerSource;
  answerUpdatedAt?: string;
  examType?: ExamType;
  examTypeName?: string;
};

const primaryPath = path.join(process.cwd(), "data/question-pools/structured-interview-questions.json");
const fallbackPath = path.join(process.cwd(), "structured_interview_questions_categorized.json");
const answerOverridePaths = [
  path.join(process.cwd(), "data/question-pools/question-answer-overrides.json"),
  path.join(process.cwd(), "data/question-pools/question-answer-overrides-002.json"),
  path.join(process.cwd(), "data/question-pools/question-answer-overrides-003.json"),
  path.join(process.cwd(), "data/question-pools/question-answer-overrides-004.json"),
  path.join(process.cwd(), "data/question-pools/question-answer-overrides-005.json"),
  path.join(process.cwd(), "data/question-pools/question-answer-overrides-006.json"),
  path.join(process.cwd(), "data/question-pools/question-answer-overrides-007.json"),
  path.join(process.cwd(), "data/question-pools/question-answer-overrides-008.json"),
  path.join(process.cwd(), "data/question-pools/question-answer-overrides-009.json"),
  path.join(process.cwd(), "data/question-pools/question-answer-overrides-010.json"),
  path.join(process.cwd(), "data/question-pools/question-answer-overrides-011.json"),
  path.join(process.cwd(), "data/question-pools/question-answer-overrides-012.json"),
  path.join(process.cwd(), "data/question-pools/question-answer-overrides-013.json"),
];
const remoteFallbackUrl = "https://raw.githubusercontent.com/pancunzhi1124-pixel/xiaohongshu-interview-platform/question-pools/structured_interview_questions_categorized.json";

function normalizeAnswerStatus(value: unknown): AnswerStatus {
  if (value === "ready" || value === "reviewing" || value === "pending") return value;
  return "pending";
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return items.length > 0 ? items : undefined;
}

function normalizeAnswerOverride(value: unknown): StructuredQuestionAnswer | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  return {
    answerStatus: normalizeAnswerStatus(item.answerStatus),
    answerOutline: normalizeStringArray(item.answerOutline),
    keyPoints: normalizeStringArray(item.keyPoints),
    sampleAnswer: typeof item.sampleAnswer === "string" ? item.sampleAnswer : undefined,
    scoringRubric: typeof item.scoringRubric === "string" ? item.scoringRubric : undefined,
    answerSource: item.answerSource === "manual" || item.answerSource === "ai_generated" || item.answerSource === "mixed" ? item.answerSource : undefined,
    answerUpdatedAt: typeof item.answerUpdatedAt === "string" ? item.answerUpdatedAt : undefined,
  };
}

async function loadAnswerOverrides(): Promise<Record<string, StructuredQuestionAnswer>> {
  const merged: Record<string, StructuredQuestionAnswer> = {};
  for (const filePath of answerOverridePaths) {
    try {
      const file = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(file);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
      for (const [id, value] of Object.entries(parsed)) {
        const normalized = normalizeAnswerOverride(value);
        if (normalized) merged[id] = normalized;
      }
    } catch {
      // optional batch file
    }
  }
  return merged;
}

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
      const answerStatus = normalizeAnswerStatus(item.answerStatus);
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
        answerStatus,
        answerOutline: normalizeStringArray(item.answerOutline),
        keyPoints: normalizeStringArray(item.keyPoints),
        sampleAnswer: typeof item.sampleAnswer === "string" ? item.sampleAnswer : undefined,
        scoringRubric: typeof item.scoringRubric === "string" ? item.scoringRubric : undefined,
        answerSource: item.answerSource === "manual" || item.answerSource === "ai_generated" || item.answerSource === "mixed" ? item.answerSource : undefined,
        answerUpdatedAt: typeof item.answerUpdatedAt === "string" ? item.answerUpdatedAt : undefined,
        examType,
        examTypeName: getExamTypeName(examType),
      };
    });
}

async function parsePoolContent(content: string): Promise<StructuredInterviewQuestion[]> {
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return normalize(parsed);
  } catch {
    return [];
  }
}

async function readPool(filePath: string): Promise<StructuredInterviewQuestion[]> {
  try {
    const file = await fs.readFile(filePath, "utf8");
    return parsePoolContent(file);
  } catch {
    return [];
  }
}

async function readRemotePool(): Promise<StructuredInterviewQuestion[]> {
  try {
    const response = await fetch(remoteFallbackUrl, { next: { revalidate: 3600 } });
    if (!response.ok) return [];
    return parsePoolContent(await response.text());
  } catch {
    return [];
  }
}

async function loadBaseQuestions() {
  const primary = await readPool(primaryPath);
  if (primary.length > 0) return primary;
  const fallback = await readPool(fallbackPath);
  if (fallback.length > 0) return fallback;
  const remoteFallback = await readRemotePool();
  if (remoteFallback.length > 0) return remoteFallback;
  return [];
}

export async function loadStructuredInterviewQuestions(): Promise<StructuredInterviewQuestion[]> {
  const questions = await loadBaseQuestions();
  const overrides = await loadAnswerOverrides();
  return questions.map((question) => {
    const override = overrides[question.id];
    if (!override) return question;
    return { ...question, ...override, answerStatus: override.answerStatus ?? question.answerStatus };
  });
}
