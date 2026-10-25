"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readKnowledgeCards, selectRelevantKnowledge, type KnowledgeCard } from "@/lib/knowledge-library";

export default function LessonPlansPage() {
  const [theme,setTheme]=useState("");
  const [grade,setGrade]=useState("多个学段");
  const [duration,setDuration]=useState("40");
  const [context,setContext]=useState("");
  const [materials,setMaterials]=useState("");
  const [result,setResult]=useState("");
  const [resultSources,setResultSources]=useState<KnowledgeCard[]>([]);
  const [loading,setLoading]=useState(false);
  const [libraryCards,setLibraryCards]=useState<KnowledgeCard[]>([]);
  const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const [manualSelection,setManualSelection]=useState(false);
  const query=useMemo(()=>[theme,grade,context].filter(Boolean).join(" "),[theme,grade,context]);
  const recommended=useMemo(()=>selectRelevantKnowledge(libraryCards,query,5),[libraryCards,query]);
  const selectedCards=useMemo(()=>libraryCards.filter(card=>selectedIds.includes(card.id)),[libraryCards,selectedIds]);

  useEffect(()=>setLibraryCards(readKnowledgeCards()),[]);
  useEffect(()=>{
    if(!manualSelection) setSelectedIds(recommended.map(card=>card.id));
  },[recommended,manualSelection]);

  function toggleCard(id:string) {
    setManualSelection(true);
    setSelectedIds(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id].slice(0,5));
  }
  function resetRecommendations(){setManualSelection(false);setSelectedIds(recommended.map(card=>card.id));}

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setLoading(true);setResult("");setResultSources([]);
    try{
      const knowledgeCards=selectedCards.map(card=>({sourceType:card.sourceType,sourceTitle:card.sourceTitle,sourceLocation:card.sourceLocation,content:card.markdown,tags:card.tags}));
      const response=await fetch("/api/lesson-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({theme,grade,duration:Number(duration),context,materials,knowledgeCards})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"教案生成失败");setResult(data.markdown||"未返回教案内容");setResultSources(selectedCards);
    }catch(error){setResult("生成失败："+(error instanceof Error?error.message:"请稍后重试"));}
    finally{setLoading(false);}
  }
  function downloadMarkdown(){
    const blob=new Blob([result],{type:"text/markdown;charset=utf-8"});
    const url=URL.createObjectURL(blob);const anchor=document.createElement("a");
    anchor.href=url;anchor.download=`${theme.trim().replace(/[^\p{L}\p{N}-]+/gu,"-").slice(0,50)||"主题班会教案"}.md`;
    anchor.click();URL.revokeObjectURL(url);
  }

  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white md:px-10"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="text-sm text-cyan-300">← 返回工作台</Link><Link href="/library" className="text-sm text-cyan-300">管理知识库 →</Link></div><header className="my-7"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Lesson plan studio</p><h1 className="mt-2 text-3xl font-bold md:text-4xl">活动体验型主题班会教案工坊</h1><p className="mt-3 max-w-2xl text-slate-300">根据主题自动匹配知识库中的相关概念与教师方法，组合成适龄的体验活动、讨论任务、技能练习和课后行动。</p></header>
  <form onSubmit={submit} className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-5 md:grid-cols-2 md:p-7">
  <label className="grid gap-2 text-sm text-slate-200 md:col-span-2">班会主题<input required value={theme} onChange={e=>{setTheme(e.target.value);setManualSelection(false);}} placeholder="例如：考试焦虑与自我调节、同伴冲突、网络素养" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500"/></label>
  <label className="grid gap-2 text-sm text-slate-200">适用学段<select value={grade} onChange={e=>{setGrade(e.target.value);setManualSelection(false);}} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3"><option>多个学段</option><option>小学</option><option>初中</option><option>高中</option><option>中职</option><option>大学</option></select></label>
  <label className="grid gap-2 text-sm text-slate-200">班会时长<select value={duration} onChange={e=>setDuration(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3"><option value="20">20 分钟</option><option value="30">30 分钟</option><option value="40">40 分钟</option><option value="45">45 分钟</option><option value="60">60 分钟</option></select></label>
  <label className="grid gap-2 text-sm text-slate-200 md:col-span-2">班级背景与实际需求<textarea value={context} onChange={e=>{setContext(e.target.value);setManualSelection(false);}} rows={4} placeholder="学生最近遇到什么情况？希望班会结束后发生什么变化？避免填写可识别学生身份的隐私。" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500"/></label>
  <label className="grid gap-2 text-sm text-slate-200 md:col-span-2">补充资料或班主任要求（可选）<textarea value={materials} onChange={e=>setMaterials(e.target.value)} rows={3} placeholder="可填写学校要求、课堂材料或其他说明。" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500"/></label>
  <section className="rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.04] p-4 md:col-span-2"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">自动匹配的知识卡片</h2><p className="mt-1 text-sm leading-6 text-slate-400">根据班会主题、学段和班级背景进行关键词匹配。生成时会将勾选内容连同来源信息交给模型。</p></div><div className="flex items-center gap-3"><span className="text-xs text-slate-400">最多选 5 张</span><button type="button" onClick={resetRecommendations} className="text-xs text-cyan-300 underline">恢复推荐</button></div></div>
    {libraryCards.length===0?<div className="mt-4 rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-400">知识库暂时为空。你可以先到 <Link href="/distill" className="text-cyan-300 underline">资料蒸馏</Link> 导入心理学书籍摘录或教师课程文字稿；也可以继续生成通用教案。</div>:recommended.length===0?<p className="mt-4 text-sm text-slate-400">暂时没有匹配到候选卡片。可前往 <Link href="/library" className="text-cyan-300 underline">知识库</Link> 检查资料，或继续生成通用教案。</p>:<div className="mt-4 space-y-2">{recommended.map(card=><label key={card.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-3"><input type="checkbox" checked={selectedIds.includes(card.id)} onChange={()=>toggleCard(card.id)} className="mt-1 accent-cyan-300"/><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{card.sourceTitle}</span><span className="mt-1 block text-xs text-slate-400">{card.sourceType==="book"?"书籍":card.sourceType==="course"?"教师课程":"笔记"} · {card.sourceLocation||"未记录章节/页码"}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{card.tags.slice(0,4).join(" · ")}</span></span><span className="text-xs text-cyan-300">{selectedIds.includes(card.id)?"已选":"候选"}</span></label>)}</div>}
  </section>
  <p className="text-xs leading-5 text-slate-400 md:col-span-2">默认采用体验式活动：情境引入、个人思考、小组任务、技能练习、行动承诺与复盘。若选“多个学段”，教案需提供不同年龄段的调整建议。学生可以选择不公开分享敏感经历。</p>
  <button disabled={loading} className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60 md:col-span-2">{loading?"正在组合知识并设计活动…":"生成活动体验型教案"}</button></form>
  {result&&<section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 md:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">生成的班会教案</h2><div className="flex gap-2"><button type="button" onClick={()=>navigator.clipboard?.writeText(result)} className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10">复制教案</button><button type="button" onClick={downloadMarkdown} className="rounded-lg border border-cyan-200/30 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-200/10">导出 Markdown</button></div></div><pre className="mt-5 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-200">{result}</pre>{resultSources.length>0&&<div className="mt-6 rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.04] p-4"><h3 className="font-semibold text-cyan-100">本次教案使用的知识来源</h3><ul className="mt-3 space-y-2">{resultSources.map(card=><li key={card.id} className="text-sm leading-6 text-slate-300"><span className="font-medium">{card.sourceTitle}</span><span className="block text-xs text-slate-400">{card.sourceLocation||"未记录章节/页码/时间戳"}</span></li>)}</ul><p className="mt-3 text-xs text-slate-500">来源清单来自本次选择的知识卡片；请同时核对教案正文中的资料追溯表。</p></div>}</section>}
  </div></main>;
}
