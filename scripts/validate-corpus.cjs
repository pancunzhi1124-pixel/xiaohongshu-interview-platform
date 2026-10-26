const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {toJSONSchema} = require('zod');
const root=path.resolve(__dirname,'..');process.chdir(root);
const result=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),'-p','tsconfig.corpus.json'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
const {corpusSchema,validateCorpus}=require('../.corpus-check/lib/psychology-corpus-schema.js');
const {initialKnowledgeCards,psychologyCorpus}=require('../.corpus-check/lib/psychology-corpus.js');
const library=require('../.corpus-check/lib/knowledge-library.js');
const dir='data/psychology-corpus';
const raw=JSON.parse(fs.readFileSync(`${dir}/corpus.json`,'utf8'));
const schema=JSON.stringify(toJSONSchema(corpusSchema,{target:'draft-2020-12'}),null,2)+'\n';
if(process.argv.includes('--export-schema'))fs.writeFileSync(`${dir}/corpus.schema.json`,schema);
else assert.equal(fs.readFileSync(`${dir}/corpus.schema.json`,'utf8'),schema,'JSON Schema must match Zod');
let checks=0;
function check(name,fn){fn();checks++;console.log(`PASS ${name}`)}
function altered(fn){const c=structuredClone(raw);fn(c);return c}
const digest=data=>createHash('sha256').update(data).digest('hex');
function validateReadingFiles(c,read=p=>fs.readFileSync(p)){
 const auditBytes=read(`${dir}/${c.coverage.auditPath}`);
 assert.equal(digest(auditBytes),c.coverage.auditSha256,'reading audit hash');
 const audit=JSON.parse(auditBytes);
 assert.equal(audit.all18Complete,true);assert.equal(audit.completedLedgerAudits,c.sources.length);
 for(const s of c.sources){
  const bytes=read(`${dir}/${s.readingLogPath}`);
  assert.equal(digest(bytes),s.readingLogSha256,`${s.id} reading log hash`);
  const log=JSON.parse(bytes);assert.equal(log.sourceId,s.id);assert.equal(log.sourceSha256,s.sha256);
  assert.equal(log.format,s.format);assert.deepEqual(log.unreadGaps,[]);
  assert.equal(log.chapters.length,s.chapterRecordCount);
  assert(log.chapters.every(ch=>Array.isArray(ch.summaries)&&ch.summaries.some(x=>typeof x==='string'&&x.trim().length>10)),`${s.id} needs substantive chapter notes`);
  assert.deepEqual(log.chapters.filter(ch=>ch.pdfRange).map(ch=>ch.pdfRange),s.bodyRanges);
  assert.deepEqual(log.readRanges,s.readRanges);assert.deepEqual(log.epubReadUnits,s.epubReadUnits);
  const proof=audit.books.find(b=>b.sourceId===s.id);
  assert(proof&&proof.fullBookReadAudited&&proof.shaMatchesInventory);
  assert.equal(proof.sourceSha256,s.sha256);
  if(s.format==='PDF')assert.deepEqual(proof.unaccountedPhysicalRanges,[]);
 }
}
check('schema and cross-record provenance',()=>validateCorpus(raw));
check('18 sources have actual chapter logs and matching fingerprints',()=>validateReadingFiles(raw));
check('changing a status alone cannot replace reading notes',()=>{
 const s=raw.sources[0];const p=`${dir}/${s.readingLogPath}`;const broken=JSON.parse(fs.readFileSync(p));broken.chapters=[];
 assert.throws(()=>validateReadingFiles(raw,name=>name===p?Buffer.from(JSON.stringify(broken)):fs.readFileSync(name)));
});
check('unknown source rejected',()=>assert.throws(()=>validateCorpus(altered(c=>c.cards[0].sourceRefs[0].sourceId='UNKNOWN'))));
check('in-range cover cannot be cited as body evidence',()=>assert.throws(()=>validateCorpus(altered(c=>c.cards[0].sourceRefs[0].pdfPages=[1]))));
check('full-book page gap rejected',()=>assert.throws(()=>validateCorpus(altered(c=>c.sources[0].readRanges=[[1,312],[314,656]]))));
check('EPUB cannot have invented PDF pagination',()=>assert.throws(()=>validateCorpus(altered(c=>c.sources.find(s=>s.format==='EPUB').pdfPageCount=200))));
check('EPUB locator bounds and file identity checked',()=>{
 const i=raw.cards.findIndex(c=>c.sourceRefs.some(r=>r.epubLocation));assert(i>=0);
 assert.throws(()=>validateCorpus(altered(c=>c.cards[i].sourceRefs[0].epubLocation.paragraphs=[9999,10000])));
 assert.throws(()=>validateCorpus(altered(c=>c.cards[i].sourceRefs[0].epubLocation.href='invented.html')));
});
check('incorrect count, duplicate IDs and unknown topics rejected',()=>{
 assert.throws(()=>validateCorpus(altered(c=>c.coverage.fullBooksRead--)));
 assert.throws(()=>validateCorpus(altered(c=>c.cards.push(c.cards[0]))));
 assert.throws(()=>validateCorpus(altered(c=>c.cards[0].topicIds=['UNKNOWN'])));
});
const initial=initialKnowledgeCards();
check('all 18 books are grounded in cards; all cards fit lesson API limits',()=>{
 assert.equal(new Set(raw.cards.flatMap(c=>c.sourceRefs.map(r=>r.sourceId))).size,18);
 for(const card of initial){assert(card.markdown.length<=8000);assert(card.sourceTitle.length<=300);assert(card.sourceLocation.length<=500);assert(card.tags.length<=20)}
});
check('EPUB rendered as spine/file/paragraphs, no fake PDF pages',()=>{
 const card=initial.find(c=>c.distillation.sourceRefs.some(r=>r.epubLocation));
 assert(card.markdown.includes('EPUB正文顺序'));assert(card.sourceLocation.includes('index_split_001.html'));
});
check('grade alone and irrelevant query do not select cards',()=>{
 assert.equal(library.selectRelevantKnowledge(initial,'初中',5,'初中').length,0);
 assert.equal(library.selectRelevantKnowledge(initial,'',5).length,0);
 assert.equal(library.selectRelevantKnowledge(initial,'火星轨道陨石',5).length,0);
});
check('structured grade filtering and relevant bounded retrieval',()=>{
 const planning=initial.find(c=>c.distillation.id==='K03');
 assert(!library.isApplicableToGrade(planning,'小学低段'));assert(library.isApplicableToGrade(planning,'初中'));
 const found=library.selectRelevantKnowledge(initial,'同伴合作 分工 班级凝聚力',3,'初中');
 assert(found.length>0&&found.length<=3);assert.equal(library.selectRelevantKnowledge(initial,'合作',0).length,0);
});
check('teacher-only use stays visible',()=>{
 const guidance=initial.filter(c=>c.distillation.audience==='teacher_guidance');assert(guidance.length>0);
 assert(guidance.every(c=>c.markdown.includes('教师备课指导')));
});
const storage=new Map();global.window={localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}};
const legacy={id:'legacy',sourceType:'notes',sourceTitle:'自有旧卡',sourceLocation:'未提供',createdAt:'2026-10-26',markdown:'教师自有笔记',tags:['合作']};
check('legacy ordinary and selected-passage structured cards remain readable',()=>{
 const old=structuredClone(initial[0]);old.id='psychology-20261026-K01';old.distillation.inspectionStatus='selected_sections_inspected';old.markdown='旧版选章记录，保留';
 library.importKnowledgeCards([legacy,old]);assert.equal(library.readKnowledgeCards().length,2);
});
check('new release adds cards without overwriting user or old version',()=>{
 library.importKnowledgeCards(initial);
 const round=JSON.parse(JSON.stringify(library.readKnowledgeCards()));assert.equal(round.length,initial.length+2);
 assert.equal(round.find(c=>c.id==='legacy').markdown,legacy.markdown);
 assert.equal(round.find(c=>c.id==='psychology-20261026-K01').markdown,'旧版选章记录，保留');
 assert.deepEqual(round.find(c=>c.id===initial[0].id).distillation.sourceRefs,initial[0].distillation.sourceRefs);
 library.importKnowledgeCards([{...legacy,markdown:'backup must not overwrite'}]);
 assert.equal(library.readKnowledgeCards().find(c=>c.id==='legacy').markdown,legacy.markdown);
});
check('invalid metadata rejected, duplicates deduplicated',()=>{
 const bad=structuredClone(initial[0]);bad.id='broken';bad.distillation.inspectionStatus='not_processed';
 assert(!library.importKnowledgeCards([bad]).some(c=>c.id==='broken'));
 const a={...legacy,id:'duplicate'};const before=library.readKnowledgeCards().length;
 library.importKnowledgeCards([a,a]);assert.equal(library.readKnowledgeCards().length,before+1);
});
check('deleting current card persists; no automatic reappearance',()=>{
 library.removeKnowledgeCard(initial[0].id);assert(!library.readKnowledgeCards().some(c=>c.id===initial[0].id));
 assert(library.readKnowledgeCards().some(c=>c.id==='legacy'));
});
check('capacity failure preserves storage atomically',()=>{
 const before=storage.get('zhixin-knowledge-library-v1');
 assert.throws(()=>library.importKnowledgeCards(Array.from({length:100},(_,i)=>({...legacy,id:`extra-${i}`}))));
 assert.equal(storage.get('zhixin-knowledge-library-v1'),before);
});
console.log(JSON.stringify({checks,sources:raw.sources.length,cards:raw.cards.length,fullBooksRead:raw.coverage.fullBooksRead,pdfPages:raw.coverage.totalPdfPhysicalPages}));
