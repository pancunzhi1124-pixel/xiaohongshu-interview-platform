import { z } from "zod";

const text = z.string().trim().min(1);
const texts = z.array(text).min(1);
const pages = z.array(z.number().int().positive());
export const gradeBandSchema = z.enum(["小学低段", "小学高段", "初中", "高中", "中职", "大学"]);
export const sourceReferenceSchema = z.object({
  sourceId: text,
  pdfPages: pages.min(1),
  chapter: text,
  printedPages: z.string().nullable(),
  evidenceNote: text,
}).strict();

export const distillationCardSchema = z.object({
  id: text,
  title: text,
  topicIds: texts,
  applicableGrades: z.array(gradeBandSchema).min(1),
  audience: z.enum(["student_activity", "teacher_guidance"]),
  inspectionStatus: z.literal("selected_sections_inspected"),
  sourceSummary: text,
  practicalMethod: text,
  sourceRefs: z.array(sourceReferenceSchema).min(1),
  evidenceLevel: z.literal("book_passage_verified_not_independent_research_review"),
  ageGradeRationale: text,
  activity: z.object({
    origin: z.literal("original_teaching_adaptation"),
    name: text,
    durationMinutes: z.number().int().positive(),
    materials: texts,
    steps: texts,
    debriefQuestions: texts,
    observationEvidence: text,
    transferAction: text,
    alternatives: texts,
    adaptations: z.object({
      小学低段: text, 小学高段: text, 初中: text, 高中: text, 中职: text, 大学: text,
    }).strict(),
    difficultyAdjustment: text,
  }).strict(),
  limitations: texts,
  commonMisconception: text,
  safety: z.object({
    prohibited: texts,
    stopRule: text,
    teacherReviewRequired: z.literal(true),
  }).strict(),
  validationStatus: z.literal("source_checked_activity_not_field_tested"),
}).strict();
export type DistillationCard = z.infer<typeof distillationCardSchema>;

export const corpusSchema = z.object({
  schemaVersion: z.literal("1.0.0"), createdOn: text, language: z.literal("zh-CN"), pageConvention: text,
  coverage: z.object({
    reportedAttachments: z.number().int().nonnegative(),
    accessibleBooks: z.number().int().nonnegative(),
    missingAttachments: z.number().int().nonnegative(),
    fullBooksRead: z.number().int().nonnegative(),
    readingMode: text,
    pendingSlots: z.array(z.object({ slot: text, status: z.literal("attachment_not_returned"), title: z.null(), reason: text }).strict()),
  }).strict(),
  sources: z.array(z.object({
    id: text, title: text, authors: text, edition: text, originalFilename: text,
    sha256: z.string().regex(/^[a-f0-9]{64}$/), pdfPageCount: z.number().int().positive(),
    status: z.enum(["selected_sections_inspected", "toc_only", "not_processed"]),
    bibliographyPages: pages, tocPages: pages, bodyPages: pages, visuallyCheckedPages: pages,
    inspectedScope: text, limitations: text, unprocessedScope: text,
  }).strict()),
  topics: z.array(z.object({ id: text, label: text, keywords: texts }).strict()),
  gradeBands: z.array(gradeBandSchema).min(1),
  cards: z.array(distillationCardSchema),
  supplementarySafetySources: z.array(z.object({ id: text, title: text, url: z.url(), checkedOn: text, scope: text }).strict()),
}).strict();
export type PsychologyCorpus = z.infer<typeof corpusSchema>;

// Shape validation alone cannot establish that a locator points to an inspected page.
export function validateCorpus(input: unknown): PsychologyCorpus {
  const corpus = corpusSchema.parse(input);
  const unique = (items: string[], label: string) => {
    if (new Set(items).size !== items.length) throw new Error(`${label}包含重复ID`);
  };
  unique(corpus.sources.map(s => s.id), "来源");
  unique(corpus.cards.map(c => c.id), "卡片");
  unique(corpus.topics.map(t => t.id), "主题");
  unique(corpus.coverage.pendingSlots.map(p => p.slot), "缺失附件槽位");
  const { coverage } = corpus;
  if (coverage.accessibleBooks !== corpus.sources.length || coverage.missingAttachments !== coverage.pendingSlots.length ||
      coverage.reportedAttachments !== coverage.accessibleBooks + coverage.missingAttachments || coverage.fullBooksRead !== 0) {
    throw new Error("附件数量或阅读覆盖状态不一致；本版仅支持选章核读");
  }
  const sources = new Map(corpus.sources.map(s => [s.id, s]));
  const topics = new Set(corpus.topics.map(t => t.id));
  for (const s of corpus.sources) {
    const inspected = [...s.bibliographyPages, ...s.tocPages, ...s.bodyPages];
    if (inspected.some(p => p > s.pdfPageCount) || s.visuallyCheckedPages.some(p => !inspected.includes(p))) {
      throw new Error(`${s.id}阅读范围或视觉抽查页不合法`);
    }
    if (s.status !== "selected_sections_inspected" && s.bodyPages.length > 0) throw new Error(`${s.id}未核读状态与正文记录冲突`);
  }
  for (const c of corpus.cards) {
    if (c.topicIds.some(id => !topics.has(id))) throw new Error(`${c.id}引用未知主题`);
    if (c.applicableGrades.some(b => !corpus.gradeBands.includes(b))) throw new Error(`${c.id}学段不在词表内`);
    for (const r of c.sourceRefs) {
      const s = sources.get(r.sourceId);
      if (!s || s.status !== "selected_sections_inspected" || r.pdfPages.some(p => !s.bodyPages.includes(p))) {
        throw new Error(`${c.id}引用未核读来源或正文页：${r.sourceId}`);
      }
    }
  }
  return corpus;
}
