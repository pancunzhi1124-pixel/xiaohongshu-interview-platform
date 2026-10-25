import OpenAI from "openai";
import { z } from "zod";

const knowledgeCardSchema = z.object({
  sourceType: z.enum(["book", "course", "notes"]),
  sourceTitle: z.string().trim().min(1).max(300),
  sourceLocation: z.string().trim().max(500).default(""),
  content: z.string().trim().min(1).max(8000),
  tags: z.array(z.string().trim().max(100)).max(20).default([]),
});

const requestSchema = z.object({
  theme: z.string().trim().min(2).max(200),
  grade: z.enum(["小学", "初中", "高中", "中职", "大学", "多个学段"]),
  duration: z.number().int().min(15).max(90),
  context: z.string().trim().max(5000).default(""),
  materials: z.string().trim().max(12000).default(""),
  knowledgeCards: z.array(knowledgeCardSchema).max(5).default([]),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "请检查主题、学段和时长；知识卡片最多选择 5 张。" }, { status: 400 });
  if (!process.env.DASHSCOPE_API_KEY) return Response.json({ error: "尚未配置 DASHSCOPE_API_KEY，请先在部署环境中添加模型密钥。" }, { status: 503 });
  try {
    const client = new OpenAI({ apiKey: process.env.DASHSCOPE_API_KEY, baseURL: process.env.BAILIAN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1" });
    const { knowledgeCards, ...lessonInput } = parsed.data;
    const completion = await client.chat.completions.create({
      model: process.env.BAILIAN_MODEL ?? "qwen-plus",
      temperature: 0.45,
      messages: [
        {
          role: "system",
          content: [
            "你是一名擅长活动体验式班会、心理健康教育与教研设计的班主任助手。使用中文 Markdown 输出可直接修改使用的教案。",
            "优先设计让学生亲自参与的活动，而不是教师长篇讲授。至少包含一个情境体验/互动活动、一个同伴合作或讨论环节、一个可练习的技能和一个低负担的课后行动。可根据主题选择情境卡、匿名投票、角色扮演、站位选择、排序任务、案例讨论、呼吸/注意力练习、行动计划等形式；不必每次都用同一套游戏。",
            "必须包含：基本信息、班级需求与设计假设、认知/情感/行为目标、重点难点、课前准备、精确到分钟的活动流程表、每环节教师引导语/学生任务/材料/观察指标、板书或课件提纲、不同参与方式、课后行动、效果评价与复盘、资料来源追溯表。",
            "流程表中所有环节时长之和必须严格等于用户指定时长。每个教学目标都应有对应活动与评价证据。",
            "学段适配：小学用短步骤、具体情境和可视化材料；初中重视同伴关系、情绪识别和自主选择；高中重视复杂情境、压力管理和自主决策；中职关注真实岗位/生活场景；大学可加入自我反思与迁移。如果选择“多个学段”，先给一套主教案，再提供小学、初中、高中及以上的具体调整建议，不能只写一句“因材施教”。",
            "知识卡片是用户提供的资料，不代表所有观点都已核实。仅将相关内容用于教案；区分书籍/课程中的观点与教学设计建议；保留来源名称、章节/页码/时间戳；没有提供来源定位时明确写“来源位置未提供”。不得编造作者、页码、研究或引文。若没有知识卡片，清楚标记为通用教案，不虚构参考资料。",
            "学生安全优先：不强迫学生公开披露创伤、家庭隐私、心理诊断或个人经历；提供匿名书写、旁观、跳过等替代参与方式；避免羞辱、贴标签和把正常情绪病理化。班会不能替代心理诊断、治疗或危机干预。遇到急性风险，应提醒教师按学校危机流程联系合格专业人员。",
            "尊重版权：基于资料作原创概括，不复现整章书籍或完整课程文字稿。"
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({ ...lessonInput, knowledgeCards }),
        },
      ],
    });
    const markdown = completion.choices[0]?.message?.content?.trim();
    if (!markdown) return Response.json({ error: "模型未返回有效教案，请重试。" }, { status: 502 });
    return Response.json({ markdown, matchedKnowledgeCount: knowledgeCards.length });
  } catch {
    return Response.json({ error: "调用模型失败，请检查模型配置和服务状态。" }, { status: 502 });
  }
}
