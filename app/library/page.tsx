"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { importKnowledgeCards, readKnowledgeCards, removeKnowledgeCard, type KnowledgeCard } from "@/lib/knowledge-library";
import { initialKnowledgeCards, psychologyCorpus } from "@/lib/psychology-corpus";

const sourceLabel = (type: KnowledgeCard["sourceType"]) => type === "book" ? "心理学书籍" : type === "course" ? "教师课程" : "讲义 / 笔记";

export default function LibraryPage() {
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [selected, setSelected] = useState<KnowledgeCard | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => setCards(readKnowledgeCards()), []);

  function importInitialCorpus() {
    const existing = readKnowledgeCards();
    const currentIds = new Set(existing.map(card => card.id));
    const additions = initialKnowledgeCards().filter(card => !currentIds.has(card.id));
    if (additions.length === 0) {
      setNotice("本轮知识卡已在当前知识库中；旧版和自有卡片均保留。");
      return;
    }
    if (existing.length + additions.length > 100) {
      setNotice("知识库剩余空间不足，请先导出备份并整理卡片后再导入。");
      return;
    }
    setCards(importKnowledgeCards(additions));
    setNotice(`已加入 ${additions.length} 张本轮知识卡。活动为原创教学改编，尚未实地试教；请在生成教案前核对学段与边界。`);
  }

  function remove(id: string) {
    if (!window.confirm("确定删除这张知识卡片吗？此操作只会删除当前浏览器中的本地记录。")) return;
    setCards(removeKnowledgeCard(id));
    if (selected?.id === id) setSelected(null);
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(cards, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "zhixin-knowledge-library-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("已导出知识库备份文件。请妥善保管，其中包含你的资料摘要和来源信息。");
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("备份格式不正确，文件应为知识卡片数组。");
      const next = importKnowledgeCards(parsed);
      setCards(next);
      setNotice(`已导入备份；当前共 ${next.length} 张知识卡片。无法识别的记录已跳过。`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "导入失败，请检查 JSON 文件。");
    } finally {
      event.target.value = "";
    }
  }

  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white md:px-10"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="text-sm text-cyan-300">← 返回工作台</Link><div className="flex gap-3"><Link href="/distill" className="text-sm text-cyan-300">蒸馏新资料 →</Link><Link href="/lesson-plans" className="text-sm text-cyan-300">设计班会 →</Link></div></div>
    <header className="my-7"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Knowledge library</p><h1 className="mt-2 text-3xl font-bold md:text-4xl">我的知识库</h1><p className="mt-3 max-w-2xl text-slate-300">管理已蒸馏的心理学书籍和教师课程知识卡片。生成班会教案时，系统会根据主题与班级需求推荐相关内容。</p></header>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"><div><p className="font-semibold">当前浏览器中的知识卡片</p><p className="mt-1 text-sm text-slate-400">{cards.length} 张卡片 · 本地保存，不会自动跨设备同步</p></div><div className="flex flex-wrap items-center gap-2"><label className="cursor-pointer rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10">导入备份<input type="file" accept=".json,application/json" onChange={importBackup} className="hidden"/></label><button type="button" onClick={exportBackup} disabled={cards.length===0} className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40">导出备份</button><Link href="/distill" className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">＋ 蒸馏新资料</Link></div></div>
    <section className="mb-6 rounded-2xl border border-cyan-200/20 bg-cyan-200/5 p-4">
      <h2 className="font-semibold">18本全书阅读与知识提炼</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">已完成 {psychologyCorpus.coverage.pdfBooks} 本PDF与 {psychologyCorpus.coverage.epubBooks} 本EPUB的逐章全文阅读，保留每本阅读记录及定位，整理 {psychologyCorpus.cards.length} 张卡片。活动为原创教学改编，尚未实地试教。</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">每张卡保留来源版本、PDF物理页或EPUB正文定位、学段与安全边界；原书疑误与缺损另记。旧卡与自有卡保留，教师指导卡用于备课审查。</p>
      <button type="button" onClick={importInitialCorpus} className="mt-3 rounded-xl border border-cyan-200/30 px-4 py-2 text-sm text-cyan-100">导入本轮 {psychologyCorpus.cards.length} 张知识卡</button>
    </section>
    {notice&&<p role="status" className="mb-5 rounded-xl border border-cyan-200/15 bg-cyan-200/5 p-3 text-sm text-cyan-100">{notice}</p>}
    {cards.length === 0 ? <section className="rounded-3xl border border-dashed border-white/15 p-10 text-center"><div className="text-4xl">📚</div><h2 className="mt-4 text-xl font-bold">知识库还没有内容</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">先导入一段你有权使用的书籍摘录或教师课程文字稿，生成第一张知识卡片。系统不会凭空填充不存在的书籍或老师观点。</p><Link href="/distill" className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-slate-950">开始蒸馏</Link></section> : <div className="grid gap-4 lg:grid-cols-[1fr_1fr]"><section className="space-y-3">{cards.map(card=><article key={card.id} className={`rounded-2xl border p-4 transition ${selected?.id===card.id?"border-cyan-300/50 bg-cyan-300/5":"border-white/10 bg-white/[0.03]"}`}><div className="flex items-start justify-between gap-3"><button onClick={()=>setSelected(card)} className="min-w-0 flex-1 text-left"><span className="text-xs text-cyan-300">{sourceLabel(card.sourceType)} · {new Date(card.createdAt).toLocaleDateString()}</span><h2 className="mt-1 font-semibold">{card.sourceTitle}</h2><p className="mt-1 text-sm text-slate-400">{card.sourceLocation || "未记录章节或时间戳"}</p></button><button onClick={()=>remove(card.id)} aria-label={`删除 ${card.sourceTitle}`} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-rose-400/10 hover:text-rose-200">删除</button></div><div className="mt-3 flex flex-wrap gap-2">{[...(card.distillation?.audience==="teacher_guidance"?["教师备课指导"]:[]),...card.tags].slice(0,4).map(tag=><span key={tag} className="rounded-full bg-white/5 px-2 py-1 text-xs text-slate-400">{tag}</span>)}</div></article>)}</section><section className="min-h-72 rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h2 className="text-lg font-bold">知识卡片预览</h2>{selected?<><p className="mt-1 text-sm text-slate-400">{selected.sourceTitle} · {selected.sourceLocation||"未记录位置"}</p><pre className="mt-5 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-200">{selected.markdown}</pre></>:<p className="mt-4 text-sm leading-6 text-slate-400">选择左侧卡片，查看蒸馏结果和来源信息。</p>}</section></div>}
    <p className="mt-7 text-xs leading-5 text-slate-500">隐私提示：知识卡片保存在此浏览器的 localStorage 中。清除浏览器站点数据会删除这些卡片；建议定期导出备份。不要在公共设备上保存敏感资料。</p>
  </div></main>;
}
