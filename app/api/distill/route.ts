import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({
  sourceType: z.enum(["book", "course", "notes"]),
  sourceTitle: z.string().trim().min(1).max(300),
  sourceLocation: z.string().trim().max(300).default(""),
  content: z.string().trim().min(40).max(30000),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "请填写来源名称，并提供 40–30000 字符的资料片段。" }, { status: 400 });
  if (!process.env.DASHSCOPE_API_KEY) return Response.json({ error: "尚未配置 DASHSCOPE_API_KEY，请先在部署环境中添加模型密钥。" }, { status: 503 });
  try {
    const client = new OpenAI({ apiKey: process.env.DASHSCOPE_API_KEY, baseURL: process.env.BAILIAN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1" });
    const completion = await client.chat.completions.create({
      model: process.env.BAILIAN_MODEL ?? "qwen-plus",
      temperature: 0.2,
      messages: [
        { role: "system", content: "你是严谨的教育知识蒸馏助手。根据用户提供的片段输出中文 Markdown，不能虚构来源、页码、研究、数据或讲师原话；区分资料明确表达的观点与自己的教学转化建议。优先原创概括，不要续写或大段复现受版权保护的原文。心理学结论如无法从片段判断依据，请标注待核实。输出结构：来源卡片、核心摘要、核心概念（解释/适用条件/常见误解）、可转化的方法、适合的班会主题、边界与注意事项、来源追溯与待核实问题。" },
        { role: "user", content: JSON.stringify({ sourceType: parsed.data.sourceType, sourceTitle: parsed.data.sourceTitle, sourceLocation: parsed.data.sourceLocation || "未提供", sourceText: parsed.data.content }) },
      ],
    });
    const markdown = completion.choices[0]?.message?.content?.trim();
    if (!markdown) return Response.json({ error: "模型未返回有效内容，请重试。" }, { status: 502 });
    return Response.json({ title: parsed.data.sourceTitle, markdown });
  } catch {
    return Response.json({ error: "调用模型失败，请检查模型配置和服务状态。" }, { status: 502 });
  }
}
