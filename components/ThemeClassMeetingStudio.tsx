"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  distillationToMarkdown,
  lessonPlanToMarkdown,
  sourceTypeLabels,
  type KnowledgeDistillation,
  type KnowledgeSource,
  type LessonPlan,
  type SourceType,
} from "@/lib/knowledge";

type Tab = "distill" | "plan" | "library";

const fieldClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10";
const labelClass = "block text-sm font-semibold text-slate-700";
const buttonPrimary = "inline-flex items-center justify-center rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50";
const buttonSecondary = "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50";
const storageKey = "theme-class-meeting-knowledge-v1";

export default function ThemeClassMeetingStudio() {
  const [activeTab, setActiveTab] = useState<Tab>("distill");
  const [sourceType, setSourceType] = useState<SourceType>("psychology-book");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceAuthor, setSourceAuthor] = useState("");
  const [targetAudience, setTargetAudience] = useState("中小学班主任");
  const [sourceText, setSourceText] = useState("");
  const [distilling, setDistilling] = useState(false);
  const [distillation, setDistillation] = useState<KnowledgeDistillation | null>(null);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [theme, setTheme] = useState("");
  const [gradeBand, setGradeBand] = useState("初中");
  const [durationMinutes, setDurationMinutes] = useState(40);
  const [classProfile, setClassProfile] = useState("");
  const [objectives, setObjectives] = useState("");
  const [lessonStyle, setLessonStyle] = useState("综合式");
  const [extraKnowledge, setExtraKnowledge] = useState("");
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<LessonPlan | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setSources(parsed as KnowledgeSource[]);
      }
    } catch {
      setNotice("本地知识库读取失败；可以继续使用当前页面并重新保存资料。");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(sources));
    } catch {
      setNotice("浏览器存储空间不足，请导出重要知识卡后再清理资料。");
    }
  }, [sources, hydrated]);

  const selectedSources = useMemo(
    () => sources.filter((source) => selectedSourceIds.includes(source.id)),
    [sources, selectedSourceIds],
  );

  async function handleDistill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setDistilling(true);
    setDistillation(null);
    try {
      const response = await fetch("/api/distill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, title: sourceTitle, author: sourceAuthor, targetAudience, sourceText }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "知识蒸馏失败，请稍后重试。");
      setDistillation(payload.distillation as KnowledgeDistillation);
      setNotice("已生成知识卡。检查来源依据与适用边界后，再保存到本地知识库。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "知识蒸馏失败，请稍后重试。");
    } finally {
      setDistilling(false);
    }
  }

  function saveDistillation() {
    if (!distillation || !sourceTitle.trim()) return;
    const source: KnowledgeSource = {
      id: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      title: sourceTitle.trim(),
      author: sourceAuthor.trim(),
      sourceType,
      createdAt: new Date().toISOString(),
      distillation,
    };
    setSources((current) => [source, ...current]);
    setSelectedSourceIds((current) => current.includes(source.id) ? current : [...current, source.id]);
    setNotice("已保存到当前浏览器的本地知识库，可在“知识库”中查看和导出。");
  }

  async function handleGeneratePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setGenerating(true);
    setPlan(null);
    try {
      const response = await fetch("/api/lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          gradeBand,
          durationMinutes,
          classProfile,
          objectives,
          lessonStyle,
          extraKnowledge,
          selectedKnowledge: selectedSources.map((source) => ({
            title: source.title,
            sourceType: source.sourceType,
            distillation: distillationToMarkdown(source.distillation),
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "教案生成失败，请稍后重试。");
      setPlan(payload.plan as LessonPlan);
      setNotice("教案已生成。请结合真实班情审核活动安排与学生支持边界。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "教案生成失败，请稍后重试。");
    } finally {
      setGenerating(false);
    }
  }

  function downloadText(filename: string, text: string) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("已复制到剪贴板。");
    } catch {
      setError("复制失败，请使用导出 Markdown 按钮保存内容。");
    }
  }

  function deleteSource(id: string) {
    setSources((current) => current.filter((source) => source.id !== id));
    setSelectedSourceIds((current) => current.filter((sourceId) => sourceId !== id));
  }

  function toggleSource(id: string) {
    setSelectedSourceIds((current) => current.includes(id) ? current.filter((sourceId) => sourceId !== id) : [...current, id]);
  }

  const tabs: { id: Tab; number: string; title: string; subtitle: string }[] = [
    { id: "distill", number: "01", title: "蒸馏资料", subtitle: "心理学书籍 · 教师课程" },
    { id: "library", number: "02", title: "知识库", subtitle: "查看、筛选与导出" },
    { id: "plan", number: "03", title: "生成教案", subtitle: "从知识到课堂行动" },
  ];

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-slate-900">
      <header className="border-b border-white/10 bg-[#142a2b] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-400/15 text-2xl">✳</div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-teal-200">CLASS MEETING STUDIO</p>
              <h1 className="mt-0.5 text-lg font-bold tracking-tight md:text-xl">主题班会教案工作台</h1>
            </div>
          </div>
          <div className="hidden rounded-full border border-white/15 px-4 py-2 text-xs text-slate-200 sm:block">
            心理学 × 教师课程 × 班级实践
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#142a2b] px-5 pb-12 pt-8 text-white md:px-8 md:pb-16">
        <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-72 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-teal-200/25 bg-teal-100/10 px-3 py-1.5 text-xs font-medium text-teal-100">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
              从资料蒸馏，到可执行的班会设计
            </p>
            <h2 className="mt-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight md:text-5xl">
              不只总结知识，<br className="hidden md:block" />更把知识变成课堂里的改变。
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              把心理学书籍与老师的课程拆解成核心理念、方法卡和适用边界，再将它们组合成有目标、有互动、有教师话术、能评估效果的主题班会教案。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-2xl font-bold text-teal-200">01</p>
              <p className="mt-2 text-sm font-semibold">来源可追溯</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">记录书籍、课程与依据</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-2xl font-bold text-teal-200">02</p>
              <p className="mt-2 text-sm font-semibold">方法可复用</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">从理论提炼课堂动作</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-2xl font-bold text-teal-200">03</p>
              <p className="mt-2 text-sm font-semibold">教案可落地</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">流程、话术、评价齐全</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-7 md:px-8">
        <div className="grid gap-3 md:grid-cols-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setError(""); setNotice(""); }}
              className={"rounded-2xl border p-4 text-left transition " + (activeTab === tab.id ? "border-teal-700 bg-white shadow-md shadow-slate-900/5" : "border-slate-200 bg-white/60 hover:border-teal-300 hover:bg-white")}
              aria-pressed={activeTab === tab.id}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={"text-xs font-bold tracking-widest " + (activeTab === tab.id ? "text-teal-700" : "text-slate-400")}>{tab.number}</span>
                {activeTab === tab.id ? <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">当前步骤</span> : null}
              </div>
              <h3 className="mt-2 text-lg font-bold">{tab.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{tab.subtitle}</p>
            </button>
          ))}
        </div>

        {error ? <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
        {notice ? <div role="status" className="mt-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{notice}</div> : null}

        {activeTab === "distill" ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Knowledge distillation</p>
                <h3 className="mt-2 text-2xl font-bold">把一份资料，拆成可复用的知识卡</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">粘贴你有权使用的读书笔记、课程笔记或转写片段。系统会提炼概念、实践方法、班会转化和来源边界。</p>
              </div>
              <form className="mt-6 space-y-4" onSubmit={handleDistill}>
                <div>
                  <label className={labelClass} htmlFor="sourceType">资料类型</label>
                  <select id="sourceType" className={fieldClass} value={sourceType} onChange={(event) => setSourceType(event.target.value as SourceType)}>
                    <option value="psychology-book">心理学书籍 / 读书笔记</option>
                    <option value="teacher-course">老师的课程 / 课程转写</option>
                    <option value="other">其他教育资料</option>
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="sourceTitle">书名 / 课程名 *</label>
                    <input id="sourceTitle" className={fieldClass} required maxLength={200} value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} placeholder="例如：书名或课程主题" />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="sourceAuthor">作者 / 授课老师</label>
                    <input id="sourceAuthor" className={fieldClass} maxLength={200} value={sourceAuthor} onChange={(event) => setSourceAuthor(event.target.value)} placeholder="可选填写" />
                  </div>
                </div>
                <div>
                  <label className={labelClass} htmlFor="targetAudience">知识主要服务对象</label>
                  <input id="targetAudience" className={fieldClass} value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} placeholder="例如：小学班主任、初中生" />
                </div>
                <div>
                  <label className={labelClass} htmlFor="sourceText">资料内容 / 个人笔记 *</label>
                  <textarea id="sourceText" className={fieldClass + " min-h-64 resize-y leading-6"} required minLength={80} maxLength={50000} value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder="粘贴你整理的重点、课程笔记、允许使用的短摘录或转写片段。建议保留章节、页码或课程时间戳，便于追溯。" />
                  <div className="mt-2 flex justify-between gap-3 text-xs text-slate-400">
                    <span>至少 80 字；不建议粘贴整本书或整门付费课程。</span>
                    <span>{sourceText.length.toLocaleString()} / 50,000</span>
                  </div>
                </div>
                <button type="submit" className={buttonPrimary + " w-full"} disabled={distilling}>
                  {distilling ? "正在提炼知识卡…" : "✳ 开始蒸馏资料"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Distillation output</p>
                  <h3 className="mt-2 text-2xl font-bold">知识卡预览</h3>
                  <p className="mt-2 text-sm text-slate-500">先审核内容与来源定位，再保存到本地知识库。</p>
                </div>
                {distillation ? <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">已生成</span> : null}
              </div>
              {!distillation ? (
                <div className="mt-6 flex min-h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-3xl">⌘</div>
                  <h4 className="mt-4 text-base font-bold">等待第一份资料</h4>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">蒸馏结果会包含核心概念、操作步骤、课堂活动转化、来源依据和适用边界。</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {["核心概念", "方法卡", "班会转化", "来源依据", "适用边界"].map((item) => <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">{item}</span>)}
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  <div className="rounded-2xl bg-[#f0f7f4] p-4">
                    <p className="text-xs font-bold text-teal-800">主旨摘要</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{distillation.summary}</p>
                  </div>
                  <div>
                    <h4 className="font-bold">核心概念 <span className="text-sm font-medium text-slate-400">{distillation.keyIdeas.length}</span></h4>
                    <div className="mt-3 space-y-3">
                      {distillation.keyIdeas.map((idea, index) => (
                        <article key={idea.name + index} className="rounded-2xl border border-slate-200 p-4">
                          <h5 className="font-semibold">{index + 1}. {idea.name}</h5>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{idea.explanation}</p>
                          <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700"><span className="font-semibold text-teal-800">课堂转化：</span>{idea.classroomApplication}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold">可操作方法</h4>
                    <div className="mt-3 space-y-3">
                      {distillation.methods.map((method, index) => (
                        <article key={method.name + index} className="rounded-2xl border border-slate-200 p-4">
                          <h5 className="font-semibold">{method.name}</h5>
                          <p className="mt-1 text-sm text-slate-500">适用情境：{method.bestFor}</p>
                          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700">{method.steps.map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}</ol>
                          {method.cautions.length ? <p className="mt-3 text-sm leading-6 text-amber-800">注意：{method.cautions.join("；")}</p> : null}
                        </article>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold">来源依据与边界</h4>
                    <div className="mt-3 space-y-2">
                      {distillation.evidenceNotes.map((note, index) => <p key={index} className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{note.claim}<span className="mt-1 block text-xs text-slate-400">定位：{note.sourceLocation} · 可信度：{note.confidence}</span></p>)}
                      {distillation.limitations.map((item, index) => <p key={index} className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm leading-6 text-amber-900">边界：{item}</p>)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <button type="button" className={buttonPrimary} onClick={saveDistillation}>保存到知识库</button>
                    <button type="button" className={buttonSecondary} onClick={() => downloadText("knowledge-distillation.md", "# " + sourceTitle + "\n\n来源：" + sourceAuthor + "\n\n" + distillationToMarkdown(distillation))}>导出 Markdown</button>
                    <button type="button" className={buttonSecondary} onClick={() => copyText(distillationToMarkdown(distillation))}>复制知识卡</button>
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === "library" ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Personal knowledge library</p>
                <h3 className="mt-2 text-2xl font-bold">我的知识库</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">资料目前保存在当前浏览器中。重要知识卡请导出 Markdown 并备份到仓库的 knowledge 目录。</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm"><span className="text-2xl font-bold">{sources.length}</span><span className="ml-2 text-slate-500">份已蒸馏资料</span></div>
            </div>
            {!hydrated ? <p className="mt-6 text-sm text-slate-500">正在读取本地知识库…</p> : sources.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <p className="text-lg font-bold">知识库还空着</p>
                <p className="mt-2 text-sm text-slate-500">先蒸馏一份心理学书籍或教师课程，审核后保存到这里。</p>
                <button type="button" className={buttonPrimary + " mt-5"} onClick={() => setActiveTab("distill")}>去蒸馏资料</button>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {sources.map((source) => (
                  <article key={source.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">{sourceTypeLabels[source.sourceType]}</span>
                        <h4 className="mt-3 text-lg font-bold">{source.title}</h4>
                        <p className="mt-1 text-sm text-slate-500">{source.author || "未填写作者 / 授课老师"} · {new Date(source.createdAt).toLocaleDateString("zh-CN")}</p>
                      </div>
                      <button type="button" className="text-sm font-medium text-rose-600 hover:text-rose-800" onClick={() => deleteSource(source.id)} aria-label={"删除" + source.title}>删除</button>
                    </div>
                    <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-600">{source.distillation.summary}</p>
                    <p className="mt-3 text-xs text-slate-400">{source.distillation.keyIdeas.length} 个核心概念 · {source.distillation.methods.length} 个方法卡</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" className={buttonSecondary} onClick={() => downloadText(source.title.replace(/[^\p{L}\p{N}-]+/gu, "-") + ".md", "# " + source.title + "\n\n来源：" + source.author + "\n\n" + distillationToMarkdown(source.distillation))}>导出知识卡</button>
                      <button type="button" className={buttonSecondary} onClick={() => toggleSource(source.id)}>{selectedSourceIds.includes(source.id) ? "✓ 已用于教案" : "选入教案"}</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <p className="text-sm text-slate-500">已选中 {selectedSourceIds.filter((id) => sources.some((source) => source.id === id)).length} 份资料供教案生成使用。</p>
              <button type="button" className={buttonPrimary} onClick={() => setActiveTab("plan")}>使用知识生成教案 →</button>
            </div>
          </section>
        ) : null}

        {activeTab === "plan" ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Lesson plan builder</p>
              <h3 className="mt-2 text-2xl font-bold">设计一节真正能上的班会</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">写清楚学生需要发生什么变化，再选择相关知识卡。教案会包含流程、教师话术、评价和安全边界。</p>
              <form className="mt-6 space-y-4" onSubmit={handleGeneratePlan}>
                <div>
                  <label className={labelClass} htmlFor="theme">班会主题 *</label>
                  <input id="theme" className={fieldClass} required minLength={2} maxLength={200} value={theme} onChange={(event) => setTheme(event.target.value)} placeholder="例如：面对同伴评价，建立稳定的自我认同" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="gradeBand">年级段</label>
                    <select id="gradeBand" className={fieldClass} value={gradeBand} onChange={(event) => setGradeBand(event.target.value)}>
                      {["小学低年级", "小学高年级", "初中", "高中", "中职", "大学"].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="durationMinutes">班会时长</label>
                    <select id="durationMinutes" className={fieldClass} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}>
                      {[20, 30, 35, 40, 45, 50, 60, 80].map((item) => <option key={item} value={item}>{item} 分钟</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass} htmlFor="lessonStyle">活动风格</label>
                  <select id="lessonStyle" className={fieldClass} value={lessonStyle} onChange={(event) => setLessonStyle(event.target.value)}>
                    {["体验式", "讨论式", "情境式", "项目式", "综合式"].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="classProfile">班级真实情况</label>
                  <textarea id="classProfile" className={fieldClass + " min-h-24 resize-y leading-6"} maxLength={3000} value={classProfile} onChange={(event) => setClassProfile(event.target.value)} placeholder="例如：班级人数、最近发生的现象、学生参与特点、已有班级约定。请避免填写学生真实姓名或敏感隐私。" />
                </div>
                <div>
                  <label className={labelClass} htmlFor="objectives">希望学生带走什么</label>
                  <textarea id="objectives" className={fieldClass + " min-h-20 resize-y leading-6"} maxLength={2000} value={objectives} onChange={(event) => setObjectives(event.target.value)} placeholder="可写希望学生理解、练习或在一周内做到的事情。" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className={labelClass}>调用知识卡</label>
                    <button type="button" className="text-xs font-semibold text-teal-700 hover:text-teal-900" onClick={() => setActiveTab("library")}>管理知识库</button>
                  </div>
                  {sources.length === 0 ? (
                    <div className="mt-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-500">
                      还没有已保存的知识卡。可以先去“蒸馏资料”，也可以直接填写下方补充知识。
                      <button type="button" className="ml-1 font-semibold text-teal-700" onClick={() => setActiveTab("distill")}>开始蒸馏 →</button>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {sources.map((source) => (
                        <label key={source.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
                          <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" checked={selectedSourceIds.includes(source.id)} onChange={() => toggleSource(source.id)} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{source.title}</span>
                            <span className="mt-1 block text-xs text-slate-500">{sourceTypeLabels[source.sourceType]} · {source.distillation.keyIdeas.length} 个核心概念</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelClass} htmlFor="extraKnowledge">补充知识 / 教研要求</label>
                  <textarea id="extraKnowledge" className={fieldClass + " min-h-24 resize-y leading-6"} maxLength={12000} value={extraKnowledge} onChange={(event) => setExtraKnowledge(event.target.value)} placeholder="可粘贴学校要求、已有教案片段、教研组建议或还未保存为知识卡的内容。" />
                </div>
                <button type="submit" className={buttonPrimary + " w-full"} disabled={generating}>
                  {generating ? "正在生成教案…" : "✳ 生成主题班会教案"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Class meeting plan</p>
                  <h3 className="mt-2 text-2xl font-bold">教案预览</h3>
                  <p className="mt-2 text-sm text-slate-500">输出是教案初稿，使用前请按真实班情审核。</p>
                </div>
                {plan ? <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">已生成</span> : null}
              </div>
              {!plan ? (
                <div className="mt-6 flex min-h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-3xl">✎</div>
                  <h4 className="mt-4 text-base font-bold">让知识落到课堂上</h4>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">完整教案包括可观察目标、课前准备、分分钟流程、教师关键话术、讨论问题、效果评价与课后延伸。</p>
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  <div className="rounded-2xl bg-[#142a2b] p-5 text-white">
                    <p className="text-xs font-semibold tracking-wide text-teal-200">{plan.targetGroup} · {plan.durationMinutes} 分钟</p>
                    <h4 className="mt-2 text-2xl font-bold leading-tight">{plan.title}</h4>
                    <p className="mt-3 text-sm leading-6 text-slate-200">核心主旨：{plan.coreMessage}</p>
                  </div>
                  <div>
                    <h4 className="font-bold">一、教学目标</h4>
                    <ul className="mt-3 space-y-2">{plan.objectives.map((item, index) => <li key={index} className="flex gap-2 text-sm leading-6 text-slate-700"><span className="font-bold text-teal-700">{index + 1}.</span><span>{item}</span></li>)}</ul>
                  </div>
                  <div>
                    <h4 className="font-bold">二、班会流程 <span className="ml-2 text-xs font-medium text-slate-400">总计 {plan.agenda.reduce((sum, step) => sum + step.minutes, 0)} 分钟</span></h4>
                    <div className="mt-3 space-y-3">
                      {plan.agenda.map((step, index) => (
                        <article key={index} className="overflow-hidden rounded-2xl border border-slate-200">
                          <div className="flex items-center gap-3 bg-slate-50 px-4 py-3">
                            <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-700 text-sm font-bold text-white">{index + 1}</span>
                            <h5 className="flex-1 font-bold">{step.stage}</h5>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-800">{step.minutes} 分钟</span>
                          </div>
                          <div className="space-y-2 p-4 text-sm leading-6">
                            <p><span className="font-semibold text-slate-800">教师：</span><span className="text-slate-600">{step.teacherActions}</span></p>
                            <p><span className="font-semibold text-slate-800">学生：</span><span className="text-slate-600">{step.studentActions}</span></p>
                            <p className="rounded-lg bg-teal-50 p-3 text-teal-900"><span className="font-semibold">设计意图：</span>{step.purpose}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <h4 className="font-bold">教师关键话术</h4>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">{plan.teacherScript.map((item, index) => <li key={index}>{item}</li>)}</ul>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <h4 className="font-bold">讨论与追问</h4>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">{plan.discussionQuestions.map((item, index) => <li key={index}>{item}</li>)}</ul>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <h4 className="font-bold">效果评价</h4>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">{plan.assessment.map((item, index) => <li key={index}>{item}</li>)}</ul>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <h4 className="font-bold">课后延伸</h4>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">{plan.followUp.map((item, index) => <li key={index}>{item}</li>)}</ul>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <h4 className="font-bold text-amber-950">学生支持与安全边界</h4>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-900">{plan.safeguardingNotes.map((item, index) => <li key={index}>{item}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="font-bold">知识来源如何转化</h4>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">{plan.sourceAlignment.map((item, index) => <li key={index}>{item}</li>)}</ul>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <button type="button" className={buttonPrimary} onClick={() => downloadText("theme-class-meeting-plan.md", lessonPlanToMarkdown(plan))}>导出完整教案 Markdown</button>
                    <button type="button" className={buttonSecondary} onClick={() => copyText(lessonPlanToMarkdown(plan))}>复制完整教案</button>
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : null}

        <footer className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-5 text-xs leading-6 text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>先理解学生，再选择方法；先明确目标，再设计活动。</p>
          <p>本地知识库仅保存在当前浏览器。请导出并备份重要资料；AI 生成内容需由教师审核。</p>
        </footer>
      </section>
    </main>
  );
}
