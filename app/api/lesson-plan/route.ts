import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({
  theme: z.string().trim().min(2).max(200),
  grade: z.enum(["小学", "初中", "高中", "中职", "大学"]),
  duration: z.number().int().min(15).max(90),
  context: z.string().trim().max(5000).default(""),
  materials: z.string().trim().max(12000).default(""),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "请检查主题、学段和时长，确保输入内容符合要求。" }, { status: 400 });
  if (!process.env.DASHSCOPE_API_KEY) return Response.json({ error: "尚未配置 DASHSCOPE_API_KEY，请先在部署环境中添加模型密钥。" }, { status: 503 });
  try {
    const client = new OpenAI({ apiKey: process.env.DASHSCOPE_API_KEY, baseURL: process.env.BAILIAN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1" });
    const completion = await client.chat.completions.create({
      model: process.env.BAILIAN_MODEL ?? "qwen-plus",
      temperature: 0.4,
      messages: [
        { role: "system", content: "你是一名重视学生主体性、心理安全和可操作性的班主任教研助手。请用中文 Markdown 生成可直接修改使用的主题班会教案。必须包含：基本信息、设计依据与假设、认知/情感/行为目标、重点难点、课前准备、按分钟分配且总和严格等于班会时长的流程表、每环节教师引导语与学生任务、板书/课件提纲、差异化参与方式、课后行动、效果评价与复盘、资料来源说明。活动应让学生主动参与，不说教、不羞辱、不诊断。不得要求学生公开讲述创伤、家庭隐私或个人心理诊断；提供可选择的书写/旁观/跳过方式。复杂心理问题不应被描述为一次班会即可解决。资料不充分时标明假设，不编造书籍、作者、研究或引用。涉及急性危机时提醒遵循学校危机处理流程并联系合格专业人员。" },
        { role: "user", content: JSON.stringify(parsed.data) },
      ],
    });
    const markdown = completion.choices[0]?.message?.content?.trim();
    if (!markdown) return Response.json({ error: "模型未返回有效教案，请重试。" }, { status: 502 });
    return Response.json({ markdown });
  } catch {
    return Response.json({ error: "调用模型失败，请检查模型配置和服务状态。" }, { status: 502 });
  }
}
