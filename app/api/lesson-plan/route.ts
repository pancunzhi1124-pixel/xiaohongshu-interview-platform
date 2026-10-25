import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({
  theme: z.string().trim().min(2).max(200),
  gradeBand: z.enum(["小学低年级", "小学高年级", "初中", "高中", "中职", "大学"]),
  durationMinutes: z.number().int().min(10).max(120),
  classProfile: z.string().trim().max(3000).default(""),
  objectives: z.string().trim().max(2000).default(""),
  lessonStyle: z.enum(["体验式", "讨论式", "情境式", "项目式", "综合式"]).default("综合式"),
  extraKnowledge: z.string().trim().max(12000).default(""),
  selectedKnowledge: z.array(z.object({
    title: z.string().max(200),
    sourceType: z.enum(["psychology-book", "teacher-course", "other"]),
    distillation: z.string().max(20000),
  })).max(8).default([]),
});

const responseSchema = z.object({
  title: z.string(),
  coreMessage: z.string(),
  targetGroup: z.string(),
  objectives: z.array(z.string()).min(3).max(6),
  materials: z.array(z.string()).max(10),
  agenda: z.array(z.object({
    minutes: z.number().int().positive(),
    stage: z.string(),
    teacherActions: z.string(),
    studentActions: z.string(),
    purpose: z.string(),
  })).min(3).max(8),
  teacherScript: z.array(z.string()).min(3).max(8),
  discussionQuestions: z.array(z.string()).min(3).max(8),
  assessment: z.array(z.string()).min(2).max(6),
  followUp: z.array(z.string()).min(2).max(6),
  sourceAlignment: z.array(z.string()).max(8),
  safeguardingNotes: z.array(z.string()).min(2).max(8),
});

function fitAgendaMinutes<T extends { minutes: number }>(agenda: T[], totalMinutes: number): T[] {
  const steps = agenda.slice(0, Math.min(agenda.length, totalMinutes));
  if (!steps.length) return [];
  if (steps.length === 1) return [{ ...steps[0], minutes: totalMinutes }];

  const weights = steps.map((step) => Math.max(1, Math.round(step.minutes) || 1));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const minutes = weights.map((value) => Math.max(1, Math.floor((value / weightTotal) * totalMinutes)));
  let currentTotal = minutes.reduce((sum, value) => sum + value, 0);

  while (currentTotal > totalMinutes) {
    let target = -1;
    for (let i = 0; i < minutes.length; i += 1) {
      if (minutes[i] > 1 && (target < 0 || minutes[i] > minutes[target])) target = i;
    }
    if (target < 0) break;
    minutes[target] -= 1;
    currentTotal -= 1;
  }
  if (currentTotal < totalMinutes) minutes[minutes.length - 1] += totalMinutes - currentTotal;
  return steps.map((step, index) => ({ ...step, minutes: minutes[index] }));
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "请检查班会主题、年级和时长等必填信息。", details: parsed.error.flatten() }, { status: 400 });
  }
  if (!process.env.DASHSCOPE_API_KEY) {
    return Response.json({ error: "尚未配置 DASHSCOPE_API_KEY。请在 .env.local 中填写百炼 API Key。" }, { status: 503 });
  }

  const input = parsed.data;
  try {
    const client = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: process.env.BAILIAN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });
    const completion = await client.chat.completions.create({
      model: process.env.BAILIAN_MODEL ?? "qwen-plus",
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "你是一名有一线班主任经验的主题班会教研专家，擅长把教育心理学理论和教师课程方法转化为真实、可执行的课堂设计。",
            "生成的是班会教案，不是心理治疗、讲座摘要或说教稿。学生必须有可观察的参与、选择、讨论、练习或反思。",
            "教案必须适配指定年级、时长、班级情境；目标要可观察，流程要包含教师动作、学生活动和设计意图。",
            "严格遵循用户提供的知识卡；标注知识如何转化为活动，不得虚构书籍观点、教师原话、页码、课程时间戳或研究证据。",
            "如果未提供可靠来源，使用一般教学设计原则即可，并在来源转化部分说明没有引用特定来源。",
            "避免羞辱、强迫自我暴露、公开给学生贴心理标签或要求学生披露创伤、家庭隐私。敏感议题应提供自愿参与、替代任务和课后求助路径。",
            "流程各环节分钟数总和必须等于指定总时长。语言自然，教师话术可直接使用，活动材料要现实可得。",
            "只输出 JSON，不要使用 Markdown 围栏。",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            brief: input,
            requiredOutput: {
              title: "清晰、适合学生理解的班会标题",
              coreMessage: "一句可记住的核心主旨",
              targetGroup: "适用年级与情境",
              objectives: "3-6 条可观察的学习目标",
              materials: "课前准备与材料",
              agenda: "3-8 个环节，分钟数总和严格等于指定时长",
              teacherScript: "可直接使用的关键教师话术",
              discussionQuestions: "由浅入深、无诱导羞辱的提问",
              assessment: "当堂观察与学习证据",
              followUp: "课后巩固或班级常规延伸",
              sourceAlignment: "逐条说明使用了哪条知识卡、如何转化；没有来源时如实说明",
              safeguardingNotes: "情绪安全、隐私、替代参与和求助边界",
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
      return Response.json({ error: "模型返回内容无法解析，请调整输入后重试。" }, { status: 502 });
    }
    const result = responseSchema.safeParse(json);
    if (!result.success) {
      return Response.json({ error: "模型生成的教案结构不完整，请重试。" }, { status: 502 });
    }
    const plan = result.data;
    return Response.json({
      plan: {
        ...plan,
        targetGroup: input.gradeBand + "｜" + plan.targetGroup,
        durationMinutes: input.durationMinutes,
        agenda: fitAgendaMinutes(plan.agenda, input.durationMinutes),
      },
    });
  } catch {
    return Response.json({ error: "教案生成服务暂时不可用，请检查模型配置或稍后重试。" }, { status: 502 });
  }
}
