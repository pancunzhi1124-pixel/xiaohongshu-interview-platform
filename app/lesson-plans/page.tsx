"use client";

import Link from "next/link";
import { useState } from "react";

export default function LessonPlansPage() {
  const [theme,setTheme]=useState("");
  const [grade,setGrade]=useState("初中");
  const [duration,setDuration]=useState("40");
  const [context,setContext]=useState("");
  const [materials,setMaterials]=useState("");
  const [result,setResult]=useState("");
  const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setLoading(true);setResult("");
    try{
      const response=await fetch("/api/lesson-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({theme,grade,duration:Number(duration),context,materials})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"教案生成失败");setResult(data.markdown||"未返回教案内容");
    }catch(error){setResult("生成失败："+(error instanceof Error?error.message:"请稍后重试"));}
    finally{setLoading(false);}
  }
  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white md:px-10"><div className="mx-auto max-w-5xl"><Link href="/" className="text-sm text-cyan-300">← 返回工作台</Link><header className="my-7"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Lesson plan studio</p><h1 className="mt-2 text-3xl font-bold md:text-4xl">主题班会教案工坊</h1><p className="mt-3 max-w-2xl text-slate-300">围绕学生真实需求生成可执行的班会流程、教师引导语、板书提纲与课后复盘建议。</p></header>
  <form onSubmit={submit} className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-5 md:grid-cols-2 md:p-7">
  <label className="grid gap-2 text-sm text-slate-200 md:col-span-2">班会主题<input required value={theme} onChange={e=>setTheme(e.target.value)} placeholder="例如：考试焦虑与自我调节、同伴冲突、网络素养" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500"/></label>
  <label className="grid gap-2 text-sm text-slate-200">适用学段<select value={grade} onChange={e=>setGrade(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3"><option>小学</option><option>初中</option><option>高中</option><option>中职</option><option>大学</option></select></label>
  <label className="grid gap-2 text-sm text-slate-200">班会时长<select value={duration} onChange={e=>setDuration(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3"><option value="20">20 分钟</option><option value="30">30 分钟</option><option value="40">40 分钟</option><option value="45">45 分钟</option><option value="60">60 分钟</option></select></label>
  <label className="grid gap-2 text-sm text-slate-200 md:col-span-2">班级背景与实际需求<textarea value={context} onChange={e=>setContext(e.target.value)} rows={4} placeholder="学生最近遇到什么情况？希望班会结束后发生什么变化？避免填写可识别学生身份的隐私。" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500"/></label>
  <label className="grid gap-2 text-sm text-slate-200 md:col-span-2">知识蒸馏结果 / 教师课程方法（可选）<textarea value={materials} onChange={e=>setMaterials(e.target.value)} rows={5} placeholder="粘贴此前整理的概念、活动方法或来源说明，帮助教案与资料保持一致。" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500"/></label>
  <p className="text-xs leading-5 text-slate-400 md:col-span-2">默认要求：学生可选择不公开分享敏感经历；活动有明确时长、步骤、目标和评价方式；不把班会当作心理诊断或治疗。</p>
  <button disabled={loading} className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60 md:col-span-2">{loading?"正在设计教案…":"生成完整教案"}</button></form>
  {result&&<section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 md:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">生成的班会教案</h2><button type="button" onClick={()=>navigator.clipboard?.writeText(result)} className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10">复制教案</button></div><pre className="mt-5 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-200">{result}</pre></section>}
  </div></main>;
}
