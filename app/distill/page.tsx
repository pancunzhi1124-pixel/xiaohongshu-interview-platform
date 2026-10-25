"use client";

import Link from "next/link";
import { useState } from "react";

type Result = { title?: string; summary?: string; concepts?: string[]; methods?: string[]; cautions?: string[]; sourceNotes?: string[]; markdown?: string; error?: string };

export default function DistillPage() {
  const [sourceType, setSourceType] = useState("book");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceLocation, setSourceLocation] = useState("");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const response = await fetch("/api/distill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceType, sourceTitle, sourceLocation, content }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "蒸馏失败，请稍后重试。");
      setResult(data);
    } catch (error) { setResult({ error: error instanceof Error ? error.message : "请求失败" }); }
    finally { setLoading(false); }
  }

  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white md:px-10">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">← 返回工作台</Link>
      <header className="my-7"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Knowledge distillation</p><h1 className="mt-2 text-3xl font-bold md:text-4xl">心理学书籍与教师课程蒸馏</h1><p className="mt-3 max-w-2xl text-slate-300">把章节摘录、课程讲义或你有权使用的文字资料，整理为可追溯的知识卡片和班会活动灵感。</p></header>
      <form onSubmit={submit} className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-5 md:p-7">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-200">资料类型<select value={sourceType} onChange={e=>setSourceType(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white"><option value="book">心理学书籍 / 章节</option><option value="course">教师课程 / 讲座</option><option value="notes">讲义 / 个人笔记</option></select></label>
          <label className="grid gap-2 text-sm text-slate-200">书名或课程名称<input required value={sourceTitle} onChange={e=>setSourceTitle(e.target.value)} placeholder="例如：书名、课程名、讲师名" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500"/></label>
        </div>
        <label className="grid gap-2 text-sm text-slate-200">章节、页码或时间戳（可选）<input value={sourceLocation} onChange={e=>setSourceLocation(e.target.value)} placeholder="例如：第 3 章 / pp. 42–48 / 课程 12:30–25:00" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500"/></label>
        <label className="grid gap-2 text-sm text-slate-200">粘贴资料摘录、课程笔记或字幕片段<textarea required minLength={40} value={content} onChange={e=>setContent(e.target.value)} rows={10} placeholder="粘贴你有权处理的文本。建议一次处理一个章节或一个课程片段，以便保留来源定位。" className="resize-y rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500"/></label>
        <p className="text-xs leading-5 text-slate-400">请仅提交你有权使用的资料。系统将优先生成原创摘要，不应替代原书或完整课程，也不会自动验证所有心理学主张。</p>
        <button disabled={loading} className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60">{loading ? "正在蒸馏…" : "生成知识卡片"}</button>
      </form>
      {result?.error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{result.error}</p>}
      {result && !result.error && <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 md:p-7"><h2 className="text-2xl font-bold">{result.title || sourceTitle}</h2><p className="mt-1 text-sm text-slate-400">{sourceType === "book" ? "书籍" : sourceType === "course" ? "课程" : "笔记"} · {sourceLocation || "未提供页码或时间戳"}</p>{result.markdown ? <pre className="mt-5 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-200">{result.markdown}</pre> : <><h3 className="mt-5 font-semibold text-cyan-200">核心摘要</h3><p className="mt-2 leading-7 text-slate-200">{result.summary}</p>{[["核心概念",result.concepts],["可转化的方法",result.methods],["边界与注意事项",result.cautions],["来源追溯",result.sourceNotes]].map(([title,items])=><div key={String(title)} className="mt-5"><h3 className="font-semibold text-cyan-200">{title}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-300">{(items as string[] || []).map((item,i)=><li key={i}>{item}</li>)}</ul></div>)}</>}</section>}
      <div className="mt-7 text-sm text-slate-400">下一步：把蒸馏结果用于 <Link href="/lesson-plans" className="text-cyan-300 underline">主题班会教案工坊</Link>。</div>
    </div>
  </main>;
}
