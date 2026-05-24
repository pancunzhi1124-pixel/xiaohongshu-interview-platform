import { promises as fs } from "node:fs";
import path from "node:path";
import { pdfWorkEmergencyQuestions } from "./pdf-work-emergency";
import { pdfWorkOrganizationQuestions } from "./pdf-work-organization";
import { pdfWorkRelationQuestions } from "./pdf-work-relation";
import { pdfWorkSimulationQuestions } from "./pdf-work-simulation";
import { pdfSocialPhenomenonQuestions } from "./pdf-social-phenomenon";

export type ExamType = "national-civil-service" | "provincial-civil-service" | "public-institution" | "state-owned-enterprise";
export const canonicalQuestionTypes = ["综合分析", "社会现象", "计划组织", "应急应变", "人际沟通", "岗位认知", "现场模拟", "演讲表达", "材料分析", "专业岗题", "无领导讨论"] as const;
export type QuestionType = (typeof canonicalQuestionTypes)[number];

export type StructuredInterviewQuestion = {
  id: string;
  bankId: string;
  examType: ExamType;
  sourceTitle: string;
  examDate: string;
  province: string;
  questionNo: string;
  question: string;
  primaryType: QuestionType;
  abilityTypes: string[];
  jobTags: string[];
  difficulty: string;
  round: string;
  answer?: string;
  answerStatus: string;
};

const allowedExamTypes = new Set<ExamType>(["national-civil-service", "provincial-civil-service", "public-institution", "state-owned-enterprise"]);
const canonicalQuestionTypeSet = new Set<string>(canonicalQuestionTypes);
const questionPoolDir = path.join(process.cwd(), "data/question-pools");
const primaryStructuredPoolPath = path.join(questionPoolDir, "structured-interview-questions.json");
const fallbackStructuredPoolPath = path.join(process.cwd(), "structured_interview_questions_categorized.json");

const roundMap: Record<string, string> = { hr: "HR", business: "业务", manager: "主管", final: "终面", stress: "压力", english: "英文", all: "综合", general: "综合", unknown: "综合" };
const legacyTypeMap: Record<string, QuestionType> = { 综合分析: "综合分析", 社会现象: "社会现象", 计划组织: "计划组织", 组织管理: "计划组织", 应急应变: "应急应变", 人际关系: "人际沟通", 人际沟通: "人际沟通", 岗位认知: "岗位认知" };

function containsAny(text: string, keys: string[]) {
  return keys.some((k) => text.includes(k));
}

function inferExamType(raw: Record<string, unknown>): ExamType {
  const bankId = String(raw.bankId ?? "").toLowerCase();
  const text = [raw.sourceTitle, raw.question, ...(Array.isArray(raw.jobTags) ? raw.jobTags : [raw.jobTags])].filter(Boolean).join(" ").toLowerCase();
  if (bankId === "national-civil-service" || containsAny(text, ["国考", "国家公务员", "中央机关", "税务系统", "税务局", "国税", "海关", "边检", "铁路公安", "公安系统", "国家部委", "部委", "国考面试", "国考税务", "国考海关"])) return "national-civil-service";
  if (bankId === "provincial-civil-service" || bankId === "civil-service-structured" || (containsAny(text, ["省考", "公务员", "选调", "定向选调", "省直", "市直", "县区公务员", "市考", "遴选", "三支一扶"]) && !containsAny(text, ["国考", "国家公务员", "中央机关"]))) return "provincial-civil-service";
  if (bankId === "state-owned-enterprise" || containsAny(text, ["国企", "央企", "银行", "农商", "国家电网", "国网", "电力系统", "烟草", "铁路", "移动", "联通", "电信", "国资", "有限公司", "中烟", "邮政"])) return "state-owned-enterprise";
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

function extractYear(item: Record<string, unknown>): string {
  const date = String(item.examDate ?? "");
  return date.match(/20\d{2}/)?.[0] ?? String(item.sourceTitle ?? "").match(/20\d{2}/)?.[0] ?? "";
}

function isTargetYear(item: Record<string, unknown>): boolean {
  const year = Number(extractYear(item));
  return year >= 2023 && year <= 2026;
}

function questionNoRank(questionNo: string): number {
  const normalized = questionNo.replace(/第|题|：|:|、|\.|，|\s/g, "");
  const cnMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  const digit = normalized.match(/\d+/)?.[0];
  if (digit) return Number(digit);
  if (normalized === "十") return 10;
  if (normalized.startsWith("十")) return 10 + (cnMap[normalized.slice(1, 2)] ?? 0);
  if (normalized.includes("十")) {
    const [left, right] = normalized.split("十");
    return (cnMap[left] ?? 1) * 10 + (cnMap[right] ?? 0);
  }
  return cnMap[normalized.slice(0, 1)] ?? 999;
}

function classifyQuestionType(item: Record<string, unknown>, question: string): QuestionType {
  const rawType = String(item.primaryType ?? "").trim();
  if (canonicalQuestionTypeSet.has(rawType)) return rawType as QuestionType;
  const sourceTitle = String(item.sourceTitle ?? "");
  const jobTags = Array.isArray(item.jobTags) ? item.jobTags.join(" ") : String(item.jobTags ?? "");
  const text = `${sourceTitle} ${question} ${jobTags}`;
  if (containsAny(text, ["无领导", "自由讨论", "组内讨论", "对抗式辩论", "辩论", "个人陈述", "总结陈词", "推荐一人发言", "推选一人"])) return "无领导讨论";
  if (containsAny(question, ["现场模拟", "情景模拟", "请模拟", "请你模拟", "请现场", "你会怎么说", "你怎样劝", "如何劝", "怎么劝", "劝说", "开导"])) return "现场模拟";
  if (containsAny(question, ["演讲", "即兴", "串词", "编故事", "自拟题目", "发表一段", "发表讲话", "作一次讲话", "口述", "发言稿", "开场白", "宣传稿"])) return "演讲表达";
  if (containsAny(question, ["材料", "漫画", "表格", "图表", "下图", "上图", "根据以上", "以上资料", "三幅图", "图中", "图里", "数据"])) return "材料分析";
  if (containsAny(text, ["结肠癌", "纳米材料", "牙科", "护理", "医学", "患者", "理财产品", "普惠金融", "绿色金融", "营运资金", "区块链", "需求分析阶段", "自动重合闸", "电能损耗", "税收", "医保", "慢病", "职业病", "金融", "银行", "电网"])) return "专业岗题";
  if (containsAny(question, ["组织", "开展", "举办", "策划", "调研", "宣传", "培训", "座谈", "活动", "会议", "检查", "排查", "走访", "筹备", "安排", "接待", "推广", "宣讲"])) return "计划组织";
  if (containsAny(question, ["突发", "突然", "现场", "投诉", "举报", "舆情", "围观", "拍视频", "怎么办", "处理", "争执", "吵闹", "火灾", "停电", "事故", "泄漏", "晕倒", "情绪激动", "大吵大闹", "堵门", "应急"])) return "应急应变";
  if (containsAny(question, ["同事", "领导", "群众", "小王", "小李", "小张", "老王", "老李", "老张", "沟通", "不配合", "不满", "批评", "误会", "矛盾", "分歧", "关系", "抱怨", "情绪低落"])) return "人际沟通";
  if (containsAny(question, ["岗位", "报考", "自我介绍", "优势", "职业规划", "新人", "入职", "适合", "匹配", "为什么选择", "为什么报考", "认识自己", "开展工作"])) return "岗位认知";
  return legacyTypeMap[rawType] ?? "综合分析";
}

function normalizeAbilityTypes(item: Record<string, unknown>, primaryType: QuestionType): string[] {
  const rawAbilityTypes = Array.isArray(item.abilityTypes) ? item.abilityTypes.map(String) : [];
  const normalized = rawAbilityTypes.map((type) => ({ 人际关系: "沟通协调", 计划组织: "组织协调", 应急应变: "应急处置", 岗位认知: "岗位匹配", 执法情景: "依法行政" }[type] ?? type)).filter((type) => type && !canonicalQuestionTypeSet.has(type));
  const extra: string[] = [];
  if (primaryType === "计划组织") extra.push("组织协调");
  if (primaryType === "应急应变") extra.push("应急处置");
  if (primaryType === "人际沟通" || primaryType === "现场模拟") extra.push("沟通协调");
  if (primaryType === "岗位认知") extra.push("岗位匹配");
  if (primaryType === "材料分析") extra.push("信息提取", "逻辑分析");
  if (primaryType === "专业岗题") extra.push("专业素养");
  if (primaryType === "无领导讨论") extra.push("团队协作", "观点表达");
  if (primaryType === "演讲表达") extra.push("语言表达");
  return Array.from(new Set([...normalized, ...extra])).slice(0, 6);
}

function buildFallbackAnswer(question: string, primaryType: QuestionType): string {
  const topic = question.replace(/\s+/g, " ").slice(0, 42);
  return `答题思路：\n这道题属于${primaryType}题。作答时要紧扣“${topic}”，先判断题干核心矛盾，再结合岗位职责、群众需求和制度边界展开。\n\n核心得分点：\n1. 准确理解题干，不偏题。\n2. 分析原因、影响和风险。\n3. 对策具体，体现可执行性。\n4. 结合岗位落实，体现责任意识。\n\n完整参考答案：\n各位考官，围绕“${topic}”，我会坚持实事求是、问题导向和结果导向。首先，准确把握题干反映的问题，既看到其积极意义，也正视其中的风险和不足。其次，结合现实工作分析原因，重点关注制度设计、执行方式、群众感受和责任落实。再次，提出有针对性的改进措施，做到依法依规、沟通充分、流程清晰、反馈及时。最后，作为工作人员，我会把认识转化为行动，主动学习政策业务，深入一线了解情况，把每项具体工作做细做实，真正回应群众和岗位需要。\n\n评分标准：\n高分答案应观点明确、结构完整、分析深入、对策务实，并能结合岗位体现服务意识和执行能力。`;
}

async function readAnswerOverrides(): Promise<Record<string, string>> {
  try {
    const files = await fs.readdir(questionPoolDir);
    const overrideFiles = files.filter((file) => /^structured-answer-overrides.*\.json$/.test(file)).sort();
    const parsedFiles = await Promise.all(overrideFiles.map(async (file) => {
      const raw = await fs.readFile(path.join(questionPoolDir, file), "utf8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === "string")) as Record<string, string>;
    }));
    return Object.assign({}, ...parsedFiles);
  } catch {
    return {};
  }
}

function normalizeStructuredQuestions(parsed: unknown, answerOverrides: Record<string, string>): StructuredInterviewQuestion[] {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .filter((item) => typeof item.id === "string" && typeof item.question === "string")
    .filter((item) => String(item.sourceKind ?? "") === "book-practice" || isTargetYear(item))
    .map((item) => {
      const examType = normalizeExamType(item);
      const question = String(item.question ?? "").trim();
      const primaryType = classifyQuestionType(item, question);
      const id = String(item.id);
      const itemAnswer = typeof item.answer === "string" ? item.answer.trim() : "";
      return {
        id,
        bankId: examType,
        examType,
        sourceTitle: String(item.sourceTitle ?? ""),
        examDate: String(item.examDate ?? ""),
        province: String(item.province ?? ""),
        questionNo: String(item.questionNo ?? ""),
        question,
        primaryType,
        abilityTypes: normalizeAbilityTypes(item, primaryType),
        jobTags: Array.isArray(item.jobTags) ? item.jobTags.map(String) : [],
        difficulty: String(item.difficulty ?? "medium"),
        round: normalizeRound(item.round),
        answer: answerOverrides[id] || itemAnswer || buildFallbackAnswer(question, primaryType),
        answerStatus: "answered",
      };
    })
    .filter((item) => allowedExamTypes.has(item.examType))
    .sort((a, b) => {
      const dateCompare = (b.examDate || "0000-00-00").localeCompare(a.examDate || "0000-00-00");
      if (dateCompare !== 0) return dateCompare;
      const sourceCompare = a.sourceTitle.localeCompare(b.sourceTitle, "zh-Hans-CN");
      if (sourceCompare !== 0) return sourceCompare;
      const orderCompare = questionNoRank(a.questionNo) - questionNoRank(b.questionNo);
      if (orderCompare !== 0) return orderCompare;
      return a.id.localeCompare(b.id);
    });
}

async function readStructuredFile(filePath: string, answerOverrides: Record<string, string>): Promise<StructuredInterviewQuestion[]> {
  try {
    const file = await fs.readFile(filePath, "utf8");
    return normalizeStructuredQuestions(JSON.parse(file), answerOverrides);
  } catch {
    return [];
  }
}

export async function loadStructuredInterviewQuestions(): Promise<StructuredInterviewQuestion[]> {
  const answerOverrides = await readAnswerOverrides();
  const pdfWorkEmergency = normalizeStructuredQuestions(pdfWorkEmergencyQuestions, answerOverrides);
  const pdfWorkOrganization = normalizeStructuredQuestions(pdfWorkOrganizationQuestions, answerOverrides);
  const pdfWorkRelation = normalizeStructuredQuestions(pdfWorkRelationQuestions, answerOverrides);
  const pdfWorkSimulation = normalizeStructuredQuestions(pdfWorkSimulationQuestions, answerOverrides);
  const pdfSocialPhenomenon = normalizeStructuredQuestions(pdfSocialPhenomenonQuestions, answerOverrides);
  const mergedSupplements = [...pdfWorkEmergency, ...pdfWorkOrganization, ...pdfWorkRelation, ...pdfWorkSimulation, ...pdfSocialPhenomenon];

  const primary = await readStructuredFile(primaryStructuredPoolPath, answerOverrides);
  if (primary.length > 0) return [...primary, ...mergedSupplements];

  const fallback = await readStructuredFile(fallbackStructuredPoolPath, answerOverrides);
  if (fallback.length > 0) return [...fallback, ...mergedSupplements];

  return mergedSupplements;
}
