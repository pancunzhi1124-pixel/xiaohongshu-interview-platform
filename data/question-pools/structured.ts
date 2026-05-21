import { promises as fs } from "node:fs";
import path from "node:path";

export type ExamType = "national-civil-service" | "provincial-civil-service" | "public-institution" | "state-owned-enterprise";

export const canonicalQuestionTypes = [
  "综合分析",
  "计划组织",
  "应急应变",
  "人际沟通",
  "岗位认知",
  "现场模拟",
  "演讲表达",
  "材料分析",
  "专业岗题",
  "无领导讨论",
] as const;

export type QuestionType = (typeof canonicalQuestionTypes)[number];

const allowedExamTypes = new Set<ExamType>([
  "national-civil-service",
  "provincial-civil-service",
  "public-institution",
  "state-owned-enterprise",
]);

const canonicalQuestionTypeSet = new Set<string>(canonicalQuestionTypes);

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

const legacyTypeMap: Record<string, QuestionType> = {
  综合分析: "综合分析",
  计划组织: "计划组织",
  应急应变: "应急应变",
  人际关系: "人际沟通",
  人际沟通: "人际沟通",
  岗位认知: "岗位认知",
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

function normalizeAbilityTypes(item: Record<string, unknown>, primaryType: QuestionType): string[] {
  const rawAbilityTypes = Array.isArray(item.abilityTypes) ? item.abilityTypes.map(String) : [];
  const normalized = rawAbilityTypes
    .map((type) => {
      if (type === "人际关系") return "沟通协调";
      if (type === "计划组织") return "组织协调";
      if (type === "应急应变") return "应急处置";
      if (type === "岗位认知") return "岗位匹配";
      if (type === "执法情景") return "依法行政";
      return type;
    })
    .filter((type) => type && !canonicalQuestionTypeSet.has(type));

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

function classifyQuestionType(item: Record<string, unknown>, question: string): QuestionType {
  const rawType = String(item.primaryType ?? "").trim();
  const sourceTitle = String(item.sourceTitle ?? "");
  const jobTags = Array.isArray(item.jobTags) ? item.jobTags.join(" ") : String(item.jobTags ?? "");
  const text = `${sourceTitle} ${question} ${jobTags}`;

  if (containsAny(text, ["无领导", "自由讨论", "组内讨论", "对抗式辩论", "辩论", "个人陈述", "总结陈词", "推荐一人发言", "推选一人"])) return "无领导讨论";
  if (containsAny(question, ["现场模拟", "情景模拟", "请模拟", "请你模拟", "请现场", "你会怎么说", "你怎样劝", "如何劝", "怎么劝", "劝说", "开导", "沟通？请", "回应？请"])) return "现场模拟";
  if (containsAny(question, ["演讲", "即兴", "串词", "编故事", "自拟题目", "发表一段", "发表讲话", "作一次讲话", "口述", "发言稿", "开场白", "宣传稿"])) return "演讲表达";
  if (containsAny(question, ["材料", "漫画", "表格", "图表", "下图", "上图", "根据以上", "以上资料", "三幅图", "图中", "图里", "数据"])) return "材料分析";
  if (containsAny(question, ["组织", "开展", "举办", "策划", "调研", "宣传", "培训", "座谈", "活动", "会议", "检查", "排查", "走访", "筹备", "安排", "接待", "推广", "宣讲"])) return "计划组织";
  if (containsAny(question, ["突发", "突然", "现场", "投诉", "举报", "舆情", "围观", "拍视频", "怎么办", "处理", "争执", "吵闹", "火灾", "停电", "事故", "泄漏", "晕倒", "情绪激动", "大吵大闹", "堵门", "应急"])) return "应急应变";
  if (containsAny(question, ["同事", "领导", "群众", "小王", "小李", "小张", "老王", "老李", "老张", "沟通", "不配合", "不满", "批评", "误会", "矛盾", "分歧", "关系", "抱怨", "情绪低落"])) return "人际沟通";
  if (containsAny(question, ["岗位", "报考", "自我介绍", "优势", "职业规划", "新人", "入职", "适合", "匹配", "为什么选择", "为什么报考", "认识自己", "开展工作"])) return "岗位认知";
  if (containsAny(text, ["结肠癌", "纳米材料", "牙科", "护理", "医学", "患者", "理财产品", "普惠金融", "绿色金融", "营运资金", "区块链", "需求分析阶段", "自动重合闸", "电能损耗", "税收", "医保", "慢病", "职业病", "金融", "银行", "电网"])) return "专业岗题";
  if (legacyTypeMap[rawType]) return legacyTypeMap[rawType];
  return "综合分析";
}

function buildAnswer(question: string, primaryType: QuestionType): string {
  const topic = question.replace(/\s+/g, " ").slice(0, 42);

  if (primaryType === "计划组织") {
    return `答题思路：\n这道题按“目标确认—前期准备—组织实施—风险控制—复盘总结”的顺序展开。重点不是简单罗列流程，而是说明工作重点、协调重点和效果保障。\n\n核心得分点：\n1. 明确活动目的、对象、节点和标准。\n2. 做好调研摸底、资源统筹、人员分工和预案。\n3. 推进中注意过程管理、反馈收集和动态优化。\n4. 结束后总结评估，形成长效机制。\n\n完整参考答案：\n各位考官，围绕“${topic}”，我会坚持目标导向、问题导向和结果导向开展。第一，吃透任务要求，向领导确认活动目的、对象范围、时间安排、资源保障和风险底线，形成任务清单。第二，做好前期摸排，了解参与对象的真实需求和可能困难，细化人员分工、物资保障、宣传通知、场地路线和应急预案。第三，实施过程中加强统筹协调，关键环节安排专人负责，及时收集群众或参与人员反馈，对突发情况快速调整，确保活动有序推进。第四，活动结束后汇总数据、成效、不足和意见建议，形成总结报告，把成熟做法转化为后续常态化工作机制。\n\n评分标准：\n高分答案应体现目标明确、流程完整、重点突出、风险意识强，并能把活动效果与群众需求或岗位职责结合起来。`;
  }

  if (primaryType === "应急应变") {
    return `答题思路：\n这道题按“先控场—再核实—分类处置—汇报反馈—复盘整改”的逻辑展开。重点是安全优先、依法依规、稳定情绪和防止事态扩大。\n\n核心得分点：\n1. 第一时间稳定现场秩序和人员情绪。\n2. 核实事实，区分轻重缓急和责任边界。\n3. 依法依规提出解决方案，必要时联动专业部门。\n4. 做好汇报、记录、回应和后续整改。\n\n完整参考答案：\n各位考官，面对“${topic}”这类情况，我会坚持冷静处置、生命安全优先、依法依规解决。第一，第一时间到达现场，稳定当事人和围观群众情绪，维护现场秩序，防止矛盾扩大；如果涉及人身安全、医疗救助、消防交通等问题，立即联系专业力量。第二，迅速核实情况，了解事件起因、各方诉求、制度依据和现实困难，做到不偏听、不拖延、不激化。第三，能现场解决的马上解决；不能立即解决的，说明办理流程、责任部门和处理时限，给群众明确预期。第四，及时向领导汇报处置进展，做好文字记录和必要的公开回应，事后复盘流程、服务或管理漏洞，推动整改。\n\n评分标准：\n高分答案应体现沉着冷静、先急后缓、处置有序、汇报及时，并能兼顾现场安全、群众情绪和舆情风险。`;
  }

  if (primaryType === "人际沟通" || primaryType === "现场模拟") {
    return `答题思路：\n这道题按“理解情绪—查明原因—讲明原则—提出方案—修复关系”的逻辑展开。现场模拟题还要注意语言自然、称呼得体、有共情也有边界。\n\n核心得分点：\n1. 先换位理解，稳定情绪，了解真实原因。\n2. 坚持工作原则和制度底线，不回避问题。\n3. 主动沟通协调，提出可执行的解决办法。\n4. 事后修复关系、总结经验，保障工作推进。\n\n完整参考答案：\n各位考官，处理“${topic}”时，我会坚持以工作为重、以沟通为桥、以原则为底线。第一，先稳定情绪，换位理解对方处境，耐心了解分歧背后的真实原因，避免带着情绪处理问题。第二，围绕共同的工作目标进行沟通，把事实、职责、制度要求和时间节点讲清楚，既表达理解，也明确原则。第三，主动承担自己能做的协调和补台工作，必要时请示领导或邀请相关同事共同参与，形成可执行的解决方案。第四，事情处理后继续做好反馈和关系维护，把一次矛盾转化为改进协作方式的机会，确保团队氛围和工作进度都不受影响。\n\n评分标准：\n高分答案应体现情绪稳定、表达有温度、原则清晰、解决方案具体，现场模拟类还要有真实对话感。`;
  }

  if (primaryType === "岗位认知") {
    return `答题思路：\n这道题按“岗位理解—自身匹配—短板补齐—未来行动”的逻辑展开。重点是把个人选择与岗位职责、群众需求和组织要求结合起来。\n\n核心得分点：\n1. 说明对岗位职责、价值和要求的理解。\n2. 结合自身经历、能力或短板谈匹配度。\n3. 强调学习意识、服务意识和纪律意识。\n4. 给出入职后的具体行动规划。\n\n完整参考答案：\n各位考官，围绕“${topic}”，我会从岗位价值、能力匹配和未来行动三个方面理解。第一，这个岗位不是简单完成事务性工作，而是要在服务群众、落实政策、推动发展中体现责任担当。第二，我会客观看待自身优势和不足，把已有的学习能力、沟通能力和执行能力转化为岗位履职能力，同时针对经验不足、业务不熟等短板主动补课。第三，入职后我会尽快熟悉政策法规和业务流程，多向领导同事请教，多到一线了解情况。第四，在具体工作中坚持小事做细、难事做实、急事做稳，以踏实作风和实际成效回应组织信任。\n\n评分标准：\n高分答案应体现动机端正、岗位理解准确、自我认知客观、行动计划具体。`;
  }

  if (primaryType === "演讲表达") {
    return `答题思路：\n这道题重点考查语言表达和价值提炼能力。作答时要有题目、有开篇、有分论点、有升华，语言要简洁有力量，避免只讲空话。\n\n核心得分点：\n1. 主题鲜明，开头能点题。\n2. 分论点清楚，能结合现实或岗位。\n3. 语言有感染力，表达流畅自然。\n4. 结尾有升华，落到行动。\n\n完整参考答案：\n各位考官，我的演讲主题是《把想法写在行动里》。围绕“${topic}”，我认为真正打动人的表达，不在于辞藻华丽，而在于方向明确、内容真实、行动有力。第一，要有信念，把个人选择放到岗位职责和时代需求中去理解。第二，要有本领，不能停留在口号上，而要通过学习、调研和实践提升解决问题的能力。第三，要有担当，在困难面前敢于往前站，在群众需要时能够靠得住。最后，我会把今天的认识转化为今后的行动，在平凡岗位上把每一件具体工作做扎实、做到位。\n\n评分标准：\n高分答案应做到主题集中、结构完整、语言流畅、情感真挚，并能自然结合岗位实际。`;
  }

  if (primaryType === "材料分析") {
    return `答题思路：\n这道题重点考查从材料、漫画、图表或数据中提炼观点的能力。作答时要先概括材料核心，再分析背后问题，最后提出对策。\n\n核心得分点：\n1. 准确提炼材料反映的核心矛盾。\n2. 能分析原因、影响和治理短板。\n3. 对策紧扣材料，不泛泛而谈。\n4. 能结合岗位说明落实路径。\n\n完整参考答案：\n各位考官，围绕“${topic}”，我会先抓住材料背后反映的核心问题：它不是一个孤立现象，而是治理理念、执行方式和群众需求之间的互动。第一，要看到材料中的积极因素，说明基层治理、公共服务或社会发展中已经有探索和变化。第二，也要看到问题所在，比如制度衔接不够、执行方式简单、群众参与不足、监督反馈不及时。第三，解决问题要坚持实事求是，既完善制度，也改进执行，既注重效率，也注重公平和温度。第四，作为工作人员，我会在实际工作中加强调研、尊重群众意见、及时反馈效果，让材料中的问题真正转化为改进工作的切入口。\n\n评分标准：\n高分答案应准确读懂材料，观点不跑偏，分析有层次，对策能回应题干中的矛盾。`;
  }

  if (primaryType === "专业岗题") {
    return `答题思路：\n这道题重点考查岗位专业素养。作答时要先明确专业判断，再结合行业规范、服务对象和风险防控展开，不能只答公共管理套话。\n\n核心得分点：\n1. 能体现与岗位相关的专业理解。\n2. 能兼顾规范、安全、服务和风险意识。\n3. 对策符合行业场景和实际流程。\n4. 表达稳妥，不夸大、不越权。\n\n完整参考答案：\n各位考官，围绕“${topic}”，我会从专业要求和岗位责任两个层面理解。第一，专业问题首先要尊重规律和规范，不能凭经验简单判断，更不能为了追求速度忽视风险。第二，要把专业能力转化为服务能力，用群众或客户听得懂的语言解释政策、流程和注意事项。第三，要重视风险防控，对涉及安全、合规、隐私、资金或健康的问题，严格按照制度流程处理。第四，在今后的工作中，我会持续学习专业知识，提升实操能力，同时保持服务意识和底线思维，做到既专业规范，又有温度。\n\n评分标准：\n高分答案应体现专业准确性、岗位匹配度、合规意识和服务意识。`;
  }

  if (primaryType === "无领导讨论") {
    return `答题思路：\n这道题重点考查无领导小组中的观点表达、团队协作和总结能力。作答时要有明确立场，也要能倾听、整合、推动共识。\n\n核心得分点：\n1. 个人陈述观点清晰，有排序或取舍依据。\n2. 讨论中能推动议程，不抢话、不沉默。\n3. 能整合不同意见，形成小组共识。\n4. 总结陈词结构清楚，回应任务要求。\n\n完整参考答案：\n各位考官，围绕“${topic}”，我会在无领导讨论中坚持观点明确、讨论有序、结果导向。个人陈述阶段，我会先说明自己的判断标准，再提出核心观点，避免空泛表态。自由讨论阶段，我会认真倾听他人意见，对相近观点进行归纳，对分歧点提出比较维度，推动小组从争论走向共识。如果出现跑题或时间紧张，我会提醒大家回到任务要求和时间安排。总结阶段，我会按照背景、共识、理由、措施的顺序进行表达，既体现集体讨论成果，也保证方案可落地。\n\n评分标准：\n高分答案应体现观点清楚、逻辑有序、合作意识强、总结能力好。`;
  }

  return `答题思路：\n这道题重点考查综合分析能力。作答时要先表明态度，再分析意义、问题或原因，最后提出对策，并结合岗位谈落实。\n\n核心得分点：\n1. 能准确抓住题干现象或观点的本质。\n2. 从积极意义、现实问题、深层原因等角度展开分析。\n3. 对策要有针对性，体现制度、执行、监督和宣传。\n4. 能结合岗位说明自己如何落实。\n\n完整参考答案：\n各位考官，对于“${topic}”，我认为要辩证、全面地看待。第一，要看到这一现象背后的积极意义，它往往反映了群众需求、治理方式变化或社会发展趋势，不能简单否定。第二，也要看到其中可能存在的问题，比如制度设计不够完善、执行过程存在偏差、资源配置不均衡、群众获得感不强，甚至出现形式主义倾向。第三，解决问题要坚持问题导向，完善规则设计，压实主体责任，加强过程监督，同时用群众听得懂、愿意听的方式做好宣传解释。第四，作为工作人员，我会立足岗位深入调研、依法依规、务实推进，把政策要求转化为具体行动，把群众诉求转化为改进方向，真正让工作取得可感可及的成效。\n\n评分标准：\n高分答案应观点明确、分析全面、对策具体，并体现公共服务意识和实践导向。`;
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
      const primaryType = classifyQuestionType(item, question);
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
        abilityTypes: normalizeAbilityTypes(item, primaryType),
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
