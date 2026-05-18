import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  expectedPoints: z.array(z.string()).default([]),
  scoringRubric: z.string().default(""),
  followUpCount: z.number().int().min(0).default(0),
});

const responseSchema = z.object({
  score: z.number().min(0).max(10),
  strengths: z.array(z.string()).max(3),
  weaknesses: z.array(z.string()).max(3),
  followUpNeeded: z.boolean(),
  followUpQuestion: z.string(),
  shortFeedback: z.string(),
});

const fallback = {
  score: 5,
  strengths: ["表达了核心观点"],
  weaknesses: ["细节和证据不足"],
  followUpNeeded: false,
  followUpQuestion: "",
  shortFeedback: "回答具备基础结构，建议补充更具体的行动与结果。",
};

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ ...fallback, shortFeedback: "请求参数不完整。" }, { status: 400 });
    }

    const { question, answer, expectedPoints, scoringRubric, followUpCount } = parsed.data;
    if (!process.env.DASHSCOPE_API_KEY) {
      return Response.json({ ...fallback, shortFeedback: "缺少 DASHSCOPE_API_KEY。" }, { status: 500 });
    }

    const client = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: process.env.BAILIAN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });

    const model = process.env.BAILIAN_MODEL ?? "qwen-plus";
    const forcedNoFollowUp = followUpCount >= 1;

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是结构化面试评估官。只能围绕当前固定主问题评分和追问，不能生成新主问题；不能泄露标准答案。输出必须是 JSON。",
        },
        {
          role: "user",
          content: JSON.stringify({
            rules: {
              onlyCurrentQuestion: true,
              maxFollowUpPerQuestion: 1,
              forcedNoFollowUp,
              noStandardAnswer: true,
              fields: [
                "score",
                "strengths",
                "weaknesses",
                "followUpNeeded",
                "followUpQuestion",
                "shortFeedback",
              ],
            },
            input: { question, answer, expectedPoints, scoringRubric, followUpCount },
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return Response.json(fallback);
    }

    const safe = responseSchema.safeParse(json);
    if (!safe.success) {
      return Response.json(fallback);
    }

    const data = safe.data;
    data.score = Math.max(0, Math.min(10, Number(data.score.toFixed(1))));
    data.strengths = data.strengths.slice(0, 3);
    data.weaknesses = data.weaknesses.slice(0, 3);

    if (forcedNoFollowUp) {
      data.followUpNeeded = false;
      data.followUpQuestion = "";
    }

    if (!data.followUpNeeded) {
      data.followUpQuestion = "";
    }

    return Response.json(data);
  } catch {
    return Response.json(fallback, { status: 200 });
  }
}
