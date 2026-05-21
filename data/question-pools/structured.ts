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

const roundMap: Record<string, string> = {
  hr: "HR",
  business: "业务",
  manager: "主管",
  final: "终面",
  stress: "压力",
  english: "英文",
  all: "综合",
  general: "综合",
  unknown: "综合",
};

const primaryTypeMap: Record<string, string> = {
  人际关系: "人际沟通",
  人际沟通: "人际沟通",
  群众工作: "人际沟通",
  基层治理: "计划组织",
  执法情景: "应急应变",
  岗位认知: "岗位认知",
  应急应变: "应急应变",
  计划组织: "计划组织",
  综合分析: "综合分析",
};

function containsAny(text: string, keys: string[]) {
  return keys.some((k) => text.includes(k));
}

function inferExamType(raw: Record<string, unknown>): ExamType {
  const bankId = String(raw.bankId ?? "").toLowerCase();
  const text = [raw.sourceTitle, raw.question, ...(Array.isArray(raw.jobTags) ? raw.jobTags : [raw.jobTags])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    bankId === "national-civil-service" ||
    containsAny(text, ["国考", "国家公务员", "中央机关", "税务系统", "税务局", "国税", "海关", "边检", "铁路公安", "公安系统", "国家部委"])
  ) return "national-civil-service";

  if (
    bankId === "provincial-civil-service" ||
    bankId === "civil-service-structured" ||
    (containsAny(text, ["省考", "公务员", "选调", "定向选调", "省直", "市直", "县区公务员", "市考", "遴选", "三支一扶"]) &&
      !containsAny(text, ["国考", "国家公务员", "中央机关"]))
  ) return "provincial-civil-service";

  if (
    bankId === "state-owned-enterprise" ||
    containsAny(text, ["国企", "央企", "银行", "农商", "国家电网", "国网", "电力系统", "烟草", "铁路", "移动", "联通", "电信", "国资", "有限公司", "中烟", "邮政"])
  ) return "state-owned-enterprise";

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

function normalizePrimaryType(type: unknown): string {
  const raw = String(type ?? "综合分析").trim() || "综合分析";
  return primaryTypeMap[raw] ?? raw;
}

function extractYear(item: Record<string, unknown>): string {
  const date = String(item.examDate ?? "");
  const dateYear = date.match(/20\d{2}/)?.[0];
  if (dateYear) return dateYear;
  const title = String(item.sourceTitle ?? "");
  return title.match(/20\d{2}/)?.[0] ?? "";
}

function isTargetYear(item: Record<string, unknown>): boolean {
  const year = Number(extractYear(item));
  return year >= 2023 && year <= 2026;
}

function answerType(question: string, primaryType: string): string {
  if (primaryType === "计划组织" || containsAny(question, ["组织", "开展", "举办", "策划", "调研", "宣传", "培训", "座谈", "活动", "会议", "检查", "排查", "走访"])) return "计划组织";
  if (primaryType === "应急应变" || containsAny(question, ["突发", "突然", "现场", "投诉", "举报", "舆情", "围观", "拍视频", "怎么办", "处理", "争执", "吵闹", "火灾", "停电", "事故", "泄漏", "晕倒"])) return "应急应变";
  if (primaryType === "人际沟通" || containsAny(question, ["同事", "领导", "群众", "小王", "小李", "小张", "老王", "沟通", "劝说", "现场模拟", "不配合", "不满", "批评"])) return "人际沟通";
  if (primaryType === "岗位认知" || containsAny(question, ["岗位", "报考", "自我介绍", "优势", "职业规划", "新人", "入职", "适合", "匹配"])) return "岗位认知";
  return "综合分析";
}

function buildAnswer(question: string, primaryType: string): string {
  const topic = question.replace(/\s+/g, " ").slice(0, 38);
  const type = answerType(question, primaryType);

  if (type === "计划组织") {
    return `这道题属于计划组织类。围绕“${topic}”，我会坚持目标导向、过程可控、结果有效。第一，明确任务要求，向领导确认活动目的、对象范围、时间节点、资源保障和风险底线，形成工作清单。第二，做好前期摸排，了解群众需求、部门职责和现实困难，细化人员分工、场地物资、宣传通知、应急预案。第三，组织实施中注重统筹协调，及时跟进进度，对突发情况快速调整，确保活动不流于形式。第四，结束后汇总数据、群众反馈和问题不足，形成总结报告，推动经验固化和后续改进。`;
  }

  if (type === "应急应变") {
    return `这道题属于应急应变类。面对“${topic}”这类情况，我会坚持先稳控、再核实、后处置。第一，第一时间到场掌握情况，安抚当事人和围观群众情绪，防止事态扩大；涉及人身安全、医疗救助、消防交通等问题的，立即联动专业力量。第二，核实事实、规则和责任边界，做到不回避、不推诿、不激化矛盾。第三，能现场解决的马上解决，不能现场解决的说明原因、给出流程和时限。第四，及时向领导汇报，做好记录和舆情回应，事后复盘制度漏洞，防止类似问题再次发生。`;
  }

  if (type === "人际沟通") {
    return `这道题属于人际沟通类。处理“${topic}”时，我会坚持换位思考、原则不让步、沟通有温度。第一，先稳定情绪，分别了解各方真实诉求和事实背景，避免简单定性。第二，围绕工作目标和制度要求进行沟通，既讲清原则边界，也给出可行替代方案。第三，主动补位协作，能自己解决的及时推动，超出权限的及时请示汇报。第四，事后做好反馈和关系修复，把矛盾化解在工作推进中，做到既维护团结，又保证任务完成。`;
  }

  if (type === "岗位认知") {
    return `这道题属于岗位认知类。围绕“${topic}”，我会从动机、能力和作风三个方面作答。第一，端正职业动机，把个人发展融入岗位职责和公共服务需要，做到服从组织安排、珍惜岗位平台。第二，补齐能力短板，主动学习政策法规、业务流程和群众沟通方法，在实践中提升解决问题的本领。第三，保持务实作风，多到一线了解情况，多向领导同事请教，多复盘工作得失。第四，以结果为导向，把小事做细、难事做实，努力成为可靠、专业、有担当的工作人员。`;
  }

  return `这道题属于综合分析类。对于“${topic}”，我会辩证看待。第一，看到其背后的现实背景和积极意义，不能简单否定；它往往反映了群众需求、治理变化或发展趋势。第二，也要看到可能存在的问题，比如制度设计不完善、执行不到位、资源配置不均、形式主义或群众获得感不足。第三，解决问题要坚持问题导向，完善制度规则，强化宣传解释，压实主体责任，加强监督评估。第四，作为工作人员，要立足岗位深入调研、依法依规、务实推进，把好政策、好举措真正转化为群众可感可及的实际成效。`;
}

function normalizeStructuredQuestions(parsed: unknown): StructuredInterviewQuestion[] {
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .filter((item) => typeof item.id === "string" && typeof item.question === "string")
    .filter(isTargetYear)
    .map((item) => {
      const examType = normalizeExamType(item);
      const question = String(item.question ?? "").trim();
      const primaryType = normalizePrimaryType(item.primaryType);
      const existingAnswer = typeof item.answer === "string" ? item.answer.trim() : "";
      const answer = existingAnswer || buildAnswer(question, primaryType);

      return {
        id: String(item.id),
        bankId: examType,
        examType,
        sourceTitle: String(item.sourceTitle ?? ""),
        examDate: String(item.examDate ?? ""),
        province: String(item.province ?? ""),
        questionNo: String(item.questionNo ?? ""),
        question,
        primaryType,
        abilityTypes: Array.isArray(item.abilityTypes) ? item.abilityTypes.map(String) : [primaryType],
        jobTags: Array.isArray(item.jobTags) ? item.jobTags.map(String) : [],
        difficulty: String(item.difficulty ?? "medium"),
        round: normalizeRound(item.round),
        answer,
        answerStatus: "answered",
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
