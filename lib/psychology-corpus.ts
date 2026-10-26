import rawCorpus from "../data/psychology-corpus/corpus.json";
import { validateCorpus, type DistillationCard } from "./psychology-corpus-schema";
import type { KnowledgeCard } from "./knowledge-library";

export const psychologyCorpus = validateCorpus(rawCorpus);

export function corpusCardMarkdown(card: DistillationCard): string {
  const sources = new Map(psychologyCorpus.sources.map(s => [s.id, s]));
  const a = card.activity;
  return [
    `# ${card.id} ${card.title}`,
    `用途：${card.audience === "teacher_guidance" ? "教师备课指导，不能直接作为学生治疗活动" : "学生低风险体验活动"}`,
    "状态：相关章节片段已核读；未阅读全文；活动为原创改编，未实地试教；未独立复核原始研究。",
    "## 来源（PDF页为从封面开始的物理页码）",
    ...card.sourceRefs.map(r => {
      const s = sources.get(r.sourceId)!;
      return `${r.sourceId} ${s.title}；${s.authors}；${s.edition}；${r.chapter}；PDF物理页 ${r.pdfPages.join(", ")}；纸书页码 ${r.printedPages ?? "未核对"}。`;
    }),
    "## 来源观点（原创摘要）", card.sourceSummary,
    "## 方法（教学转化）", card.practicalMethod,
    `适用学段：${card.applicableGrades.join("、")}。${card.ageGradeRationale}`,
    "## 体验活动（原创教学改编）", `${a.name}，建议${a.durationMinutes}分钟。材料：${a.materials.join("、")}`,
    ...a.steps.map(s => `- ${s}`),
    `复盘：${a.debriefQuestions.join("；")}`,
    `观察证据：${a.observationEvidence}`, `迁移：${a.transferAction}`,
    `替代参与：${a.alternatives.join("；")}`,
    "## 分学段调整",
    ...card.applicableGrades.map(b => `${b}：${a.adaptations[b]}`),
    "## 限制和安全",
    ...card.limitations.map(s => `- ${s}`), ...card.safety.prohibited.map(s => `- ${s}`),
    card.safety.stopRule, `常见误解：${card.commonMisconception}`,
  ].join("\n\n");
}

export function initialKnowledgeCards(): KnowledgeCard[] {
  return psychologyCorpus.cards.map(card => ({
    id: `psychology-20261026-${card.id}`, sourceType: "book",
    sourceTitle: `${psychologyCorpus.sources.find(s => s.id === card.sourceRefs[0].sourceId)!.title} · ${card.title}`,
    sourceLocation: card.sourceRefs.map(r => `${r.chapter}；PDF物理页 ${r.pdfPages.join(", ")}`).join("；"),
    createdAt: "2026-10-26T00:00:00+08:00", markdown: corpusCardMarkdown(card),
    tags: [card.title, ...card.topicIds.map(id => psychologyCorpus.topics.find(t => t.id === id)!.label), ...card.applicableGrades],
    distillation: card,
  }));
}
