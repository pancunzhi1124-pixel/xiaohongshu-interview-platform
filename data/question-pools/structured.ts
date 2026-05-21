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

function questionNoRank(questionNo: string): number {
  const normalized = questionNo.replace(/第|题|：|:|、|\.|，|\s/g, "");
  const cnMap: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };
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

function answerType(question: string, primaryType: string): string {
  if (primaryType === "计划组织" || containsAny(question, ["组织", "开展", "举办", "策划", "调研", "宣传", "培训", "座谈", "活动", "会议", "检查", "排查", "走访"])) return "计划组织";
  if (primaryType === "应急应变" || containsAny(question, ["突发", "突然", "现场", "投诉", "举报", "舆情", "围观", "拍视频", "怎么办", "处理", "争执", "吵闹", "火灾", "停电", "事故", "泄漏", "晕倒"])) return "应急应变";
  if (primaryType === "人际沟通" || containsAny(question, ["同事", "领导", "群众", "小王", "小李", "小张", "老王", "沟通", "劝说", "现场模拟", "不配合", "不满", "批评"])) return "人际沟通";
  if (primaryType === "岗位认知" || containsAny(question, ["岗位", "报考", "自我介绍", "优势", "职业规划", "新人", "入职", "适合", "匹配"])) return "岗位认知";
  return "综合分析";
}

function buildAnswer(question: string, primaryType: string): string {
  const topic = question.replace(/\s+/g, " ").slice(0, 42);
  const type = answerType(question, primaryType);

  if (type === "计划组织") {
    return `答题思路：\n这道题重点考查计划组织协调能力。作答时要先明确目标和对象，再讲前期准备、过程推进、风险控制和总结提升，避免只罗列流程，要突出“组织有重点、执行有抓手、结果有反馈”。\n\n核心得分点：\n1. 明确活动目的、服务对象、时间节点和工作标准。\n2. 做好前期调研、资源统筹、人员分工和应急预案。\n3. 推进过程中注意沟通协调、动态调整和群众反馈。\n4. 活动结束后复盘总结，形成长效机制。\n\n完整参考答案：\n各位考官，围绕“${topic}”，我会坚持目标导向、问题导向和结果导向开展工作。第一，吃透任务要求，向领导确认活动目的、对象范围、时间安排、资源保障和风险底线，形成清晰的任务清单。第二，做好前期摸排，了解参与对象的真实需求和可能困难，细化人员分工、物资保障、宣传通知、场地路线和应急预案。第三，在实施过程中加强统筹协调，关键环节安排专人负责，及时收集群众或参与人员反馈，对突发情况快速调整，确保活动有序推进。第四，活动结束后及时汇总数据、成效、不足和意见建议，形成总结报告，并把成熟做法转化为后续常态化工作机制。`;
  }

  if (type === "应急应变") {
    return `答题思路：\n这道题重点考查突发事件处置能力。作答时要体现“先控场、再核实、后解决、再复盘”的逻辑，尤其要注意安全优先、依法依规、及时汇报和舆情风险。\n\n核心得分点：\n1. 第一时间稳定现场秩序和相关人员情绪。\n2. 迅速核实事实，区分轻重缓急和责任边界。\n3. 依法依规提出解决方案，必要时联动专业部门。\n4. 做好汇报、记录、回应和后续整改。\n\n完整参考答案：\n各位考官，面对“${topic}”这类情况，我会坚持冷静处置、生命安全优先、依法依规解决。第一，第一时间到达现场，稳定当事人和围观群众情绪，维护现场秩序，防止矛盾扩大；如果涉及人身安全、医疗救助、消防交通等问题，立即联系专业力量处置。第二，迅速核实情况，了解事件起因、各方诉求、制度依据和现实困难，做到不偏听、不拖延、不激化。第三，针对能够现场解决的问题马上解决；不能立即解决的，说明办理流程、责任部门和处理时限，给群众明确预期。第四，及时向领导汇报处置进展，做好文字记录和必要的公开回应，事后复盘暴露出的流程、服务或管理漏洞，推动整改，避免类似问题再次发生。`;
  }

  if (type === "人际沟通") {
    return `答题思路：\n这道题重点考查沟通协调和人际处理能力。作答时要先稳情绪、查原因，再讲原则和方法，既不能一味迁就，也不能简单对立，要体现补位意识、规则意识和团队意识。\n\n核心得分点：\n1. 先换位理解，稳定情绪，了解真实原因。\n2. 坚持工作原则和制度底线，不回避问题。\n3. 主动沟通协调，提出可执行的解决办法。\n4. 事后修复关系、总结经验，保障工作推进。\n\n完整参考答案：\n各位考官，处理“${topic}”时，我会坚持以工作为重、以沟通为桥、以原则为底线。第一，先稳定情绪，换位理解对方处境，耐心了解分歧背后的真实原因，避免带着情绪处理问题。第二，围绕共同的工作目标进行沟通，把事实、职责、制度要求和时间节点讲清楚，既表达理解，也明确原则。第三，主动承担自己能做的协调和补台工作，必要时请示领导或邀请相关同事共同参与，形成可执行的解决方案。第四，事情处理后继续做好反馈和关系维护，把一次矛盾转化为改进协作方式的机会，确保团队氛围和工作进度都不受影响。`;
  }

  if (type === "岗位认知") {
    return `答题思路：\n这道题重点考查岗位理解、职业动机和自我匹配。作答时要把个人选择与岗位职责、群众需求、组织要求结合起来，突出愿干、能干、会干和长期成长。\n\n核心得分点：\n1. 说明对岗位职责、价值和要求的理解。\n2. 结合自身经历、能力或短板谈匹配度。\n3. 强调学习意识、服务意识和纪律意识。\n4. 给出入职后的具体行动规划。\n\n完整参考答案：\n各位考官，围绕“${topic}”，我会从岗位价值、能力匹配和未来行动三个方面理解。第一，这个岗位不是简单完成事务性工作，而是要在服务群众、落实政策、推动发展中体现责任担当。第二，我会客观看待自身优势和不足，把已有的学习能力、沟通能力和执行能力转化为岗位履职能力，同时针对经验不足、业务不熟等短板主动补课。第三，入职后我会尽快熟悉政策法规和业务流程，多向领导同事请教，多到一线了解情况。第四，在具体工作中坚持小事做细、难事做实、急事做稳，以踏实作风和实际成效回应组织信任。`;
  }

  return `答题思路：\n这道题重点考查综合分析能力。作答时要先表明态度，再分析意义、问题或原因，最后提出对策，并结合岗位谈落实，体现辩证思维和务实导向。\n\n核心得分点：\n1. 能准确抓住题干现象或观点的本质。\n2. 从积极意义、现实问题、深层原因等角度展开分析。\n3. 对策要有针对性，体现制度、执行、监督和宣传。\n4. 能结合岗位说明自己如何落实。\n\n完整参考答案：\n各位考官，对于“${topic}”，我认为要辩证、全面地看待。第一，要看到这一现象背后的积极意义，它往往反映了群众需求、治理方式变化或社会发展趋势，不能简单否定。第二，也要看到其中可能存在的问题，比如制度设计不够完善、执行过程存在偏差、资源配置不均衡、群众获得感不强，甚至出现形式主义倾向。第三，解决问题要坚持问题导向，完善规则设计，压实主体责任，加强过程监督，同时用群众听得懂、愿意听的方式做好宣传解释。第四，作为工作人员，我会立足岗位深入调研、依法依规、务实推进，把政策要求转化为具体行动，把群众诉求转化为改进方向，真正让工作取得可感可及的成效。`;
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
      const answer = existingAnswer && existingAnswer.includes("答题思路") ? existingAnswer : buildAnswer(question, primaryType);

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
