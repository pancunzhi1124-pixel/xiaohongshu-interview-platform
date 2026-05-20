import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

const root = process.cwd();
const primaryPoolPath = path.join(root, "data/question-pools/structured-interview-questions.json");
const fallbackPoolPath = path.join(root, "structured_interview_questions_categorized.json");
const overridesPath = path.join(root, "data/question-pools/question-answer-overrides.json");
const remoteFallbackUrl = "https://raw.githubusercontent.com/pancunzhi1124-pixel/xiaohongshu-interview-platform/question-pools/structured_interview_questions_categorized.json";

loadDotEnv(path.join(root, ".env.local"));
loadDotEnv(path.join(root, ".env"));

const apiKey = process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.BAILIAN_BASE_URL || (process.env.DASHSCOPE_API_KEY ? "https://dashscope.aliyuncs.com/compatible-mode/v1" : undefined);
const model = process.env.BAILIAN_MODEL || process.env.OPENAI_MODEL || "qwen-plus";
const answerLimit = Number(process.env.ANSWER_LIMIT || "0");
const answerStart = Math.max(Number(process.env.ANSWER_START || "0") || 0, 0);
const answerDelayMs = Math.max(Number(process.env.ANSWER_DELAY_MS || "800") || 800, 0);
const overwrite = process.env.ANSWER_OVERWRITE === "true";
const requestedIds = new Set((process.env.ANSWER_IDS || "").split(",").map((item) => item.trim()).filter(Boolean));
const status = process.env.ANSWER_STATUS === "ready" ? "ready" : "reviewing";

if (!apiKey) {
  console.error("缺少 API Key。请先设置 DASHSCOPE_API_KEY，或设置 OPENAI_API_KEY。");
  process.exit(1);
}

const client = new OpenAI({ apiKey, baseURL });

function loadDotEnv(filePath) {
  try {
    const text = requireSync(filePath);
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index <= 0) continue;
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore missing env file
  }
}

function requireSync(filePath) {
  return require("node:fs").readFileSync(filePath, "utf8");
}

async function readJsonArray(filePath) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readRemoteQuestions() {
  try {
    const response = await fetch(remoteFallbackUrl);
    if (!response.ok) return [];
    const parsed = JSON.parse(await response.text());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadQuestions() {
  const primary = await readJsonArray(primaryPoolPath);
  if (primary.length > 0) return primary;

  const fallback = await readJsonArray(fallbackPoolPath);
  if (fallback.length > 0) return fallback;

  return readRemoteQuestions();
}

async function loadOverrides() {
  try {
    const text = await fs.readFile(overridesPath, "utf8");
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function saveOverrides(overrides) {
  await fs.mkdir(path.dirname(overridesPath), { recursive: true });
  await fs.writeFile(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");
}

function compactQuestion(question) {
  return {
    id: question.id,
    bankId: question.bankId,
    sourceTitle: question.sourceTitle,
    examDate: question.examDate,
    province: question.province,
    questionNo: question.questionNo,
    question: question.question,
    primaryType: question.primaryType,
    abilityTypes: question.abilityTypes,
    jobTags: question.jobTags,
    difficulty: question.difficulty,
  };
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型未返回 JSON");
    return JSON.parse(match[0]);
  }
}

function normalizeGeneratedAnswer(raw) {
  const answerOutline = Array.isArray(raw.answerOutline) ? raw.answerOutline.filter((item) => typeof item === "string" && item.trim()).slice(0, 6) : [];
  const keyPoints = Array.isArray(raw.keyPoints) ? raw.keyPoints.filter((item) => typeof item === "string" && item.trim()).slice(0, 8) : [];
  const sampleAnswer = typeof raw.sampleAnswer === "string" ? raw.sampleAnswer.trim() : "";
  const scoringRubric = typeof raw.scoringRubric === "string" ? raw.scoringRubric.trim() : "";

  if (answerOutline.length === 0) throw new Error("answerOutline 为空");
  if (keyPoints.length === 0) throw new Error("keyPoints 为空");
  if (sampleAnswer.length < 80) throw new Error("sampleAnswer 过短");
  if (scoringRubric.length < 30) throw new Error("scoringRubric 过短");

  return {
    answerStatus: status,
    answerOutline,
    keyPoints,
    sampleAnswer,
    scoringRubric,
    answerSource: "ai_generated",
    answerUpdatedAt: new Date().toISOString().slice(0, 10),
  };
}

async function generateAnswer(question, attempt = 1) {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "你是中国结构化面试教研老师，擅长国考、省考、事业单位、国企银行、企业招聘面试辅导。请只输出 JSON，不要输出 Markdown。答案要稳健、合规、可用于考生训练。",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "为这道结构化面试题生成参考答案。不要编造政策出处，不要输出敏感隐私，不要泄露任何非题目内信息。",
          outputSchema: {
            answerOutline: ["答题步骤1", "答题步骤2", "答题步骤3"],
            keyPoints: ["核心要点1", "核心要点2", "核心要点3"],
            sampleAnswer: "一段完整中文参考答案，建议 450 到 800 字，适合口述。",
            scoringRubric: "评分标准，说明高分回答应该具备哪些特征。",
          },
          requirements: [
            "answerOutline 使用 3 到 6 条中文短句",
            "keyPoints 使用 4 到 8 条中文短句",
            "sampleAnswer 必须围绕题目本身，结构清楚，适合面试口头表达",
            "不要说‘作为AI’",
            "不要添加参考资料链接",
            "不要输出题目中没有的具体真实数据",
            "scoringRubric 要可用于评分",
          ],
          question: compactQuestion(question),
        }),
      },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "";
  try {
    return normalizeGeneratedAnswer(safeJsonParse(text));
  } catch (error) {
    if (attempt < 2) return generateAnswer(question, attempt + 1);
    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldSkipQuestion(question, overrides) {
  if (!question?.id || !question?.question) return true;
  if (requestedIds.size > 0 && !requestedIds.has(question.id)) return true;
  if (overwrite) return false;
  const existing = overrides[question.id];
  return Boolean(existing?.sampleAnswer && existing?.answerOutline?.length && existing?.keyPoints?.length);
}

async function main() {
  const questions = await loadQuestions();
  if (questions.length === 0) {
    console.error("没有读取到题库。请确认 data/question-pools/structured-interview-questions.json 或 question-pools 分支中的 JSON 可用。");
    process.exit(1);
  }

  const overrides = await loadOverrides();
  const candidates = questions.filter((question) => !shouldSkipQuestion(question, overrides)).slice(answerStart);
  const targetQuestions = answerLimit > 0 ? candidates.slice(0, answerLimit) : candidates;

  console.log(`读取题目：${questions.length} 道`);
  console.log(`已有答案：${Object.keys(overrides).length} 道`);
  console.log(`本次计划生成：${targetQuestions.length} 道`);
  console.log(`模型：${model}`);

  let success = 0;
  let failed = 0;

  for (let index = 0; index < targetQuestions.length; index += 1) {
    const question = targetQuestions[index];
    const label = `[${index + 1}/${targetQuestions.length}] ${question.id}`;
    try {
      console.log(`${label} 生成中：${String(question.question).slice(0, 60)}...`);
      const answer = await generateAnswer(question);
      overrides[question.id] = answer;
      await saveOverrides(overrides);
      success += 1;
      console.log(`${label} 已写入`);
    } catch (error) {
      failed += 1;
      console.error(`${label} 失败：`, error?.message ?? error);
      overrides[question.id] = {
        answerStatus: "pending",
        answerSource: "ai_generated",
        answerUpdatedAt: new Date().toISOString().slice(0, 10),
        generationError: String(error?.message ?? error),
      };
      await saveOverrides(overrides);
    }

    if (answerDelayMs > 0) await sleep(answerDelayMs);
  }

  console.log(`完成。成功：${success}，失败：${failed}。输出文件：${overridesPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
