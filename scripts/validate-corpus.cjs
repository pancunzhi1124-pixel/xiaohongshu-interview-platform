const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { toJSONSchema } = require("zod");
const root = path.resolve(__dirname, "..");
process.chdir(root);
const result = spawnSync(process.execPath, [require.resolve("typescript/bin/tsc"), "-p", "tsconfig.corpus.json"], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status || 1);
const { corpusSchema, validateCorpus } = require("../.corpus-check/lib/psychology-corpus-schema.js");
const { initialKnowledgeCards, psychologyCorpus } = require("../.corpus-check/lib/psychology-corpus.js");
const library = require("../.corpus-check/lib/knowledge-library.js");
const raw = JSON.parse(fs.readFileSync("data/psychology-corpus/corpus.json", "utf8"));
const schema = JSON.stringify(toJSONSchema(corpusSchema, { target: "draft-2020-12" }), null, 2) + "\n";
const schemaFile = "data/psychology-corpus/corpus.schema.json";
if (process.argv.includes("--export-schema")) fs.writeFileSync(schemaFile, schema);
else assert.equal(fs.readFileSync(schemaFile, "utf8"), schema, "JSON Schema must match Zod contract");

let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
function altered(fn) { const copy = structuredClone(raw); fn(copy); return copy; }
check("corpus shape and cross-record provenance", () => validateCorpus(raw));
check("coverage includes unreturned attachments without inventing books", () => {
  assert.equal(raw.coverage.reportedAttachments, raw.sources.length + raw.coverage.pendingSlots.length);
  assert.equal(raw.coverage.fullBooksRead, 0);
  assert(raw.coverage.pendingSlots.every(x => x.title === null));
});
check("unknown source rejected", () => assert.throws(() => validateCorpus(altered(c => c.cards[0].sourceRefs[0].sourceId = "UNKNOWN"))));
check("unread page rejected even when within PDF bounds", () => assert.throws(() => validateCorpus(altered(c => c.cards[0].sourceRefs[0].pdfPages = [100]))));
check("TOC-only book cannot back an inspected card", () => assert.throws(() => validateCorpus(altered(c => { c.sources[0].status = "toc_only"; c.sources[0].bodyPages = []; }))));
check("unknown topic rejected", () => assert.throws(() => validateCorpus(altered(c => c.cards[0].topicIds = ["UNKNOWN"]))));
check("duplicate card rejected", () => assert.throws(() => validateCorpus(altered(c => c.cards.push(c.cards[0])))));
check("incorrect coverage rejected", () => assert.throws(() => validateCorpus(altered(c => c.coverage.accessibleBooks++))));
const initial = initialKnowledgeCards();
check("all cards fit existing lesson API field limits", () => {
  for (const card of initial) {
    assert(card.markdown.length <= 8000);
    assert(card.sourceTitle.length <= 300);
    assert(card.sourceLocation.length <= 500);
    assert(card.tags.length <= 20);
  }
});
check("topic match is required; grade alone does not select cards", () => {
  assert.equal(library.selectRelevantKnowledge(initial, "初中", 5, "初中").length, 0);
  assert.equal(library.selectRelevantKnowledge(initial, "", 5).length, 0);
  assert.equal(library.selectRelevantKnowledge(initial, "火星轨道陨石", 5).length, 0);
});
check("structured grade excludes unsupported lower primary card", () => {
  const planning = initial.find(c => c.distillation.id === "K03");
  assert.equal(library.isApplicableToGrade(planning, "小学低段"), false);
  assert.equal(library.isApplicableToGrade(planning, "初中"), true);
  assert.equal(library.isApplicableToGrade(planning, "小学"), true);
});
check("cooperation retrieves relevant cards with a bounded count", () => {
  const selected = library.selectRelevantKnowledge(initial, "同伴合作 分工 班级凝聚力", 3, "初中");
  assert(selected.some(c => c.distillation.id === "K06" || c.distillation.id === "K12"));
  assert(selected.length <= 3);
  assert.equal(library.selectRelevantKnowledge(initial, "合作", 0).length, 0);
});
check("teacher guidance remains explicitly identified", () => {
  const guidance = initial.filter(c => c.distillation.audience === "teacher_guidance");
  assert.equal(guidance.length, 5);
  assert(guidance.every(c => c.markdown.includes("教师备课指导")));
});
const storage = new Map();
global.window = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
const legacy = { id: "legacy", sourceType: "notes", sourceTitle: "自有旧卡", sourceLocation: "未提供", createdAt: "2026-10-26", markdown: "教师自有笔记", tags: ["合作"] };
check("legacy backups still import", () => {
  assert.equal(library.importKnowledgeCards([legacy]).length, 1);
});
check("structured metadata survives save/read/export round trip", () => {
  library.importKnowledgeCards(initial);
  const roundtrip = JSON.parse(JSON.stringify(library.readKnowledgeCards()));
  assert.equal(roundtrip.length, initial.length + 1);
  assert.deepEqual(roundtrip.find(c => c.id === initial[0].id).distillation.sourceRefs, initial[0].distillation.sourceRefs);
});
check("malformed or falsely unprocessed metadata is not imported", () => {
  const broken = structuredClone(initial[0]); broken.id = "broken"; broken.distillation.inspectionStatus = "not_processed";
  assert(!library.importKnowledgeCards([broken]).some(c => c.id === "broken"));
});
check("deleting an initial card persists without automatic reappearance", () => {
  library.removeKnowledgeCard(initial[0].id);
  assert(!library.readKnowledgeCards().some(c => c.id === initial[0].id));
  assert(library.readKnowledgeCards().some(c => c.id === "legacy"));
});
console.log(JSON.stringify({ checks, sources: psychologyCorpus.sources.length, cards: initial.length, missingAttachments: psychologyCorpus.coverage.missingAttachments }));
