import { z } from "zod";
const text = z.string().trim().min(1);
const texts = z.array(text).min(1);
const page = z.number().int().positive();
const pages = z.array(page);
const range = z.tuple([page, page]).refine(([a, b]) => a <= b, "范围起止倒置");
const ranges = z.array(range);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const gradeBandSchema = z.enum(["小学低段", "小学高段", "初中", "高中", "中职", "大学"]);
const epubLocation = z.object({ spine: page, href: text, paragraphs: range }).strict();
export const sourceReferenceSchema = z.union([
  z.object({ sourceId: text, pdfPages: pages.min(1), chapter: text, printedPages: text.nullable(), evidenceNote: text }).strict(),
  z.object({ sourceId: text, pdfPages: z.tuple([]), epubLocation, chapter: text, printedPages: z.null(), evidenceNote: text }).strict(),
]);
// Old local backups stay readable. Current corpus releases require the full-source status.
export const distillationCardSchema = z.object({
  id: text, title: text, topicIds: texts, applicableGrades: z.array(gradeBandSchema).min(1),
  audience: z.enum(["student_activity", "teacher_guidance"]),
  inspectionStatus: z.enum(["selected_sections_inspected", "from_fully_read_source"]),
  sourceSummary: text, practicalMethod: text, sourceRefs: z.array(sourceReferenceSchema).min(1),
  evidenceLevel: z.literal("book_passage_verified_not_independent_research_review"), ageGradeRationale: text,
  activity: z.object({
    origin: z.literal("original_teaching_adaptation"), name: text, durationMinutes: page,
    materials: texts, steps: texts, debriefQuestions: texts, observationEvidence: text, transferAction: text, alternatives: texts,
    adaptations: z.object({ 小学低段: text, 小学高段: text, 初中: text, 高中: text, 中职: text, 大学: text }).strict(),
    difficultyAdjustment: text,
  }).strict(),
  limitations: texts, commonMisconception: text,
  safety: z.object({ prohibited: texts, stopRule: text, teacherReviewRequired: z.literal(true) }).strict(),
  validationStatus: z.literal("source_checked_activity_not_field_tested"),
}).strict();
export type DistillationCard = z.infer<typeof distillationCardSchema>;
const sourceSchema = z.object({
  id: text, title: text, authors: text, edition: text, originalFilename: text, sha256: hash,
  format: z.enum(["PDF", "EPUB"]), pdfPageCount: page.nullable(), status: z.literal("full_book_read"),
  readRanges: ranges, bodyRanges: ranges,
  epubReadUnits: z.array(epubLocation.extend({ note: text.optional() }).strict()),
  readingLogPath: text, readingLogSha256: hash, chapterRecordCount: page,
  inspectedScope: text, limitations: text, unprocessedScope: text,
}).strict();
export const corpusSchema = z.object({
  schemaVersion: z.literal("2.0.0"), releaseId: text, createdOn: text, language: z.literal("zh-CN"), pageConvention: text,
  coverage: z.object({
    initialReportedAttachments: z.literal(16), requestedBooks: page, accessibleBooks: page,
    pdfBooks: z.number().int().nonnegative(), epubBooks: z.number().int().nonnegative(),
    totalPdfPhysicalPages: page, fullBooksRead: page, readingMode: text,
    scopeOrigin: text, auditPath: text, auditSha256: hash,
  }).strict(),
  sources: z.array(sourceSchema).min(1), topics: z.array(z.object({ id: text, label: text, keywords: texts }).strict()),
  gradeBands: z.array(gradeBandSchema).min(1), cards: z.array(distillationCardSchema),
  supplementarySafetySources: z.array(z.object({ id: text, title: text, url: z.url(), checkedOn: text, scope: text }).strict()),
}).strict();
export type PsychologyCorpus = z.infer<typeof corpusSchema>;
const contains = (rs: [number, number][], p: number) => rs.some(([a, b]) => p >= a && p <= b);
export function validateCorpus(input: unknown): PsychologyCorpus {
  const c = corpusSchema.parse(input);
  const unique = (ids: string[], label: string) => { if (new Set(ids).size !== ids.length) throw new Error(`${label}包含重复ID`); };
  unique(c.sources.map(s => s.id), "来源"); unique(c.cards.map(s => s.id), "卡片"); unique(c.topics.map(s => s.id), "主题");
  const pdfs = c.sources.filter(s => s.format === "PDF"), epubs = c.sources.filter(s => s.format === "EPUB"), cov = c.coverage;
  if (cov.requestedBooks !== c.sources.length || cov.accessibleBooks !== c.sources.length || cov.fullBooksRead !== c.sources.length ||
      cov.pdfBooks !== pdfs.length || cov.epubBooks !== epubs.length ||
      cov.totalPdfPhysicalPages !== pdfs.reduce((n, s) => n + (s.pdfPageCount || 0), 0)) throw new Error("阅读范围计数不一致");
  for (const s of c.sources) {
    if (s.readingLogPath !== `reading-logs/${s.id}.json`) throw new Error(`${s.id}阅读记录路径不一致`);
    if (s.format === "PDF") {
      if (!s.pdfPageCount || s.epubReadUnits.length || s.readRanges.length !== 1 || s.readRanges[0][0] !== 1 || s.readRanges[0][1] !== s.pdfPageCount ||
          !s.bodyRanges.length || s.bodyRanges.some(([a, b]) => !contains(s.readRanges, a) || !contains(s.readRanges, b))) throw new Error(`${s.id}全书页段存在缺口`);
    } else {
      if (s.pdfPageCount !== null || s.readRanges.length || s.bodyRanges.length || !s.epubReadUnits.length) throw new Error(`${s.id}EPUB不得伪造PDF页`);
      unique(s.epubReadUnits.map(u => `${u.spine}:${u.href}`), `${s.id}EPUB单元`);
    }
  }
  const sources = new Map(c.sources.map(s => [s.id, s])), topics = new Set(c.topics.map(t => t.id));
  for (const card of c.cards) {
    if (card.inspectionStatus !== "from_fully_read_source") throw new Error(`${card.id}不属于本轮全书阅读版本`);
    if (card.topicIds.some(id => !topics.has(id)) || card.applicableGrades.some(g => !c.gradeBands.includes(g))) throw new Error(`${card.id}主题或学段未知`);
    for (const r of card.sourceRefs) {
      const s = sources.get(r.sourceId);
      if (!s) throw new Error(`${card.id}来源未知`);
      if ("epubLocation" in r) {
        const loc = r.epubLocation;
        if (s.format !== "EPUB" || !s.epubReadUnits.some(u => u.spine === loc.spine && u.href === loc.href && loc.paragraphs[0] >= u.paragraphs[0] && loc.paragraphs[1] <= u.paragraphs[1])) throw new Error(`${card.id}EPUB定位未读`);
      } else if (s.format !== "PDF" || r.pdfPages.some(p => !contains(s.bodyRanges, p))) throw new Error(`${card.id}引用未核读正文页`);
    }
  }
  return c;
}
