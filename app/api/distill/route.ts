import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({
  sourceType: z.enum(["psychology-book", "teacher-course", "other"]),
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().max(200).default(""),
  targetAudience: z.string().trim().max(500).default("中小学班主任"),
  sourceText: z.string().trim().min(80).max(50000),
});

const responseSchema = z.object({
  summary: z.string().min(1),
  keyIdeas: z.array(z.object({
    name: z.string(),
    explanation: z.string(),
    classroomApplication: z.string(),
  })).min(3).max(8),
  methods: z.array(z.object({
    name: z.string(),
    steps: z.array(z.string()).min(2).max(7),
    bestFor: z.string(),
    cautions: z.array(z.string()).max(5),
  })).max(6),
  classroomTranslations: z.array(z.object({
    studentNeed: z.string(),
    principle: z.string(),
    activity: z.string(),
  })).max(6),
  evidenceNotes: z.array(z.object({
    claim: z.string(),
    sourceLocation: z.string(),
    confidence: z.enum(["high", "medium", "low"]),
  })).max(8),
  limitations: z.array(z.string()).max(8),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({
      error: "请填写资料名称，并粘贴至少 80 个字符的原始笔记、课程转写或摘录。",
      details: parsed.error.flatten(),
    }, { status: 400 });
  }

  if (!process.env.DASHSCOPE_API_KEY) {
    return Response.json({
      error: "尚未配置 DASHSCOPE_API_KEY。请复制 .env.example 为 .env.local，并填写百炼 API Key。",
    }, { status: 503 });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: process.env.BAILIAN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });
    const completion = await client.chat.completions.create({
      model: process.env.BAILIAN_MODEL ?? "qwen-plus",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "你是教育心理学知识编辑与班会课程设计顾问。",
            "任务是把用户提供的材料蒸馏成可追溯、可用于主题班会设计的知识卡，而不是复述整本书或整门课程。",
            "只根据输入材料陈述来源事实；不得捏造原文、页码、章节、课程时间戳、研究结果或作者观点。",
            "如果材料没有页码或时间戳，sourceLocation 必须写“材料未提供精确定位”；根据材料推导出的应用建议要明确属于教学转化，而非作者原话。",
            "避免长段逐字引用，优先用自己的话总结；保留重要术语时给出通俗解释。",
            "每个概念都要回答：它是什么、为什么重要、班主任如何转化为课堂行动。",
            "必须说明适用情境与局限；不要把教育活动包装成心理治疗，也不要对学生进行诊断或贴标签。",
            "只输出符合指定字段的 JSON，不要输出 Markdown 围栏。",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            sourceType: parsed.data.sourceType,
            title: parsed.data.title,
            author: parsed.data.author || "未填写",
            targetAudience: parsed.data.targetAudience,
            sourceMaterial: parsed.data.sourceText,
            requestedOutput: {
              summary: "150-250 字的材料主旨摘要",
              keyIdeas: "3-8 个核心概念，每个包含解释与班会转化",
              methods: "最多 6 个可执行方法，每个包含步骤、适用情境和注意事项",
              classroomTranslations: "把理论转换为学生可参与的活动",
              evidenceNotes: "记录材料中可定位的依据；不确定时降低 confidence 并明确定位不足",
              limitations: "说明证据边界、误用风险及需要教师判断的地方",
            },
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return Response.json({ error: "模型返回内容无法解析，请缩短材料后重试。" }, { status: 502 });
    }
    const result = responseSchema.safeParse(json);
    if (!result.success) {
      return Response.json({ error: "模型返回结构不完整，请重试或缩短输入材料。" }, { status: 502 });
    }
    return Response.json({ distillation: result.data });
  } catch {
    return Response.json({ error: "知识蒸馏服务暂时不可用，请检查模型配置或稍后重试。" }, { status: 502 });
  }
}
