"use client";

import Link from "next/link";
import { useState } from "react";
import { createKnowledgeTags, saveKnowledgeCard, type SourceType } from "@/lib/knowledge-library";

type Result = { title?: string; markdown?: string; error?: string };

function resolveEpubPath(packagePath: string, href: string): string {
  const cleanHref = decodeURIComponent(href.split(/[?#]/, 1)[0]);
  const stack = packagePath.split("/").slice(0, -1).filter(Boolean);
  for (const part of cleanHref.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

export default function DistillPage() {
  const [sourceType, setSourceType] = useState<SourceType>("book");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceAuthor, setSourceAuthor] = useState("");
  const [sourceLocation, setSourceLocation] = useState("");
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fileError, setFileError] = useState("");

  async function readFile(file: File) {
    setFileError("");
    setFileName(file.name);
    setContent("");
    if (!sourceTitle.trim()) setSourceTitle(file.name.replace(/\.[^.]+$/, ""));
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("单个文件不能超过 20 MB。");
      if (/\.(txt|md|markdown|text)$/i.test(file.name) || file.type.startsWith("text/")) {
        setContent((await file.text()).slice(0, 30000));
        return;
      }
      if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), useSystemFonts: true }).promise;
        const pages: string[] = [];
        let charCount = 0;
        for (let pageNo = 1; pageNo <= pdf.numPages && charCount < 30000; pageNo += 1) {
          const page = await pdf.getPage(pageNo);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => "str" in item ? item.str : "").join(" ");
          pages.push(`[PDF 第 ${pageNo} 页]\n${pageText}`);
          charCount += pageText.length;
        }
        const extracted = pages.join("\n\n").slice(0, 30000);
        if (!extracted.trim()) throw new Error("没有提取到可选择的文字。这可能是扫描图片 PDF，请先 OCR 或粘贴章节摘录。");
        setContent(extracted);
        setSourceLocation((current) => current || `PDF 文本层，前 ${pages.length} 页`);
        return;
      }
      if (/\.epub$/i.test(file.name) || file.type === "application/epub+zip") {
        const { strFromU8, unzipSync } = await import("fflate");
        const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
        const containerBytes = archive["META-INF/container.xml"];
        if (!containerBytes) throw new Error("EPUB 文件缺少 container.xml，无法读取目录。");
        const containerDoc = new DOMParser().parseFromString(strFromU8(containerBytes), "application/xml");
        const rootfile = containerDoc.getElementsByTagNameNS("*", "rootfile")[0]?.getAttribute("full-path");
        if (!rootfile || !archive[rootfile]) throw new Error("无法定位 EPUB 的内容目录文件。");
        const packageDoc = new DOMParser().parseFromString(strFromU8(archive[rootfile]), "application/xml");
        const manifest = new Map<string, { href: string; mediaType: string }>();
        for (const item of Array.from(packageDoc.getElementsByTagNameNS("*", "item"))) {
          const id = item.getAttribute("id");
          const href = item.getAttribute("href");
          if (id && href) manifest.set(id, { href, mediaType: item.getAttribute("media-type") || "" });
        }
        const sections: string[] = [];
        let charCount = 0;
        for (const itemref of Array.from(packageDoc.getElementsByTagNameNS("*", "itemref"))) {
          if (charCount >= 30000) break;
          const item = manifest.get(itemref.getAttribute("idref") || "");
          if (!item || (!/xhtml|html/i.test(item.mediaType) && !/\.(xhtml|html?)($|[?#])/i.test(item.href))) continue;
          const path = resolveEpubPath(rootfile, item.href);
          const bytes = archive[path];
          if (!bytes) continue;
          const sectionDoc = new DOMParser().parseFromString(strFromU8(bytes), "text/html");
          const sectionText = (sectionDoc.body?.innerText || sectionDoc.body?.textContent || "").replace(/\s+/g, " ").trim();
          if (!sectionText) continue;
          const heading = sectionDoc.querySelector("title")?.textContent?.trim() || item.href;
          sections.push(`[EPUB 章节：${heading}]\n${sectionText}`);
          charCount += sectionText.length;
        }
        const extracted = sections.join("\n\n").slice(0, 30000);
        if (!extracted.trim()) throw new Error("没有从 EPUB 中提取到正文，请检查文件是否加密或改用章节摘录。");
        setContent(extracted);
        setSourceLocation((current) => current || `EPUB 正文，提取 ${sections.length} 个章节片段`);
        return;
      }
      throw new Error("目前支持 PDF、EPUB、TXT 和 Markdown 文件；其他电子书格式请先导出为 PDF/TXT，或直接粘贴章节摘录。");
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "读取文件失败，请改用粘贴文本。");
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setResult(null); setSaved(false);
    try {
      const response = await fetch("/api/distill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceType, sourceTitle, sourceAuthor, sourceLocation, content }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "蒸馏失败，请稍后重试。");
      setResult(data);
      if (data.markdown) {
        saveKnowledgeCard({
          id: `knowledge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sourceType,
          sourceTitle: sourceTitle.trim(),
          sourceLocation: [sourceAuthor.trim() ? `作者/讲师：${sourceAuthor.trim()}` : "", sourceLocation.trim(), fileName ? `文件：${fileName}` : ""].filter(Boolean).join(" · "),
          createdAt: new Date().toISOString(),
          markdown: String(data.markdown).slice(0, 8000),
          tags: createKnowledgeTags(sourceTitle, sourceType, String(data.markdown)),
        });
        setSaved(true);
      }
    } catch (error) { setResult({ error: error instanceof Error ? error.message : "请求失败" }); }
    finally { setLoading(false); }
  }

  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white md:px-10">
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">← 返回工作台</Link><Link href="/library" className="text-sm text-cyan-300 hover:text-cyan-200">查看知识库 →</Link></div>
      <header className="my-7"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Knowledge distillation</p><h1 className="mt-2 text-3xl font-bold md:text-4xl">心理学书籍与教师课程蒸馏</h1><p className="mt-3 max-w-2xl text-slate-300">导入 PDF 或粘贴章节摘录、教师文章与课程文字稿，整理为可追溯的知识卡片，供班会教案自动匹配。</p></header>
      <form onSubmit={submit} className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-5 md:p-7">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-200">资料类型<select value={sourceType} onChange={e=>setSourceType(e.target.value as SourceType)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white"><option value="book">心理学书籍 / 章节</option><option value="course">教师文章 / 课程文字稿</option><option value="notes">讲义 / 个人笔记</option></select></label>
          <label className="grid gap-2 text-sm text-slate-200">书名或课程名称<input required value={sourceTitle} onChange={e=>setSourceTitle(e.target.value)} placeholder="例如：书名、文章标题、课程名" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500"/></label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-200">作者或讲师（可选）<input value={sourceAuthor} onChange={e=>setSourceAuthor(e.target.value)} placeholder="按资料实际信息填写" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500"/></label>
          <label className="grid gap-2 text-sm text-slate-200">章节、页码或时间戳（可选）<input value={sourceLocation} onChange={e=>setSourceLocation(e.target.value)} placeholder="例如：第 3 章 / pp. 42–48" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500"/></label>
        </div>
        <label className="grid gap-2 text-sm text-slate-200">上传 PDF、EPUB、TXT 或 Markdown 文件（可选）<input type="file" accept=".pdf,.epub,.txt,.md,.markdown,.text,application/pdf,application/epub+zip,text/plain,text/markdown" onChange={e=>{const file=e.target.files?.[0];if(file)void readFile(file);}} className="block w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:font-semibold file:text-slate-950"/>{fileName&&<span className="text-xs text-slate-400">已选择：{fileName}</span>}{fileError&&<span role="alert" className="text-sm text-rose-300">{fileError}</span>}</label>
        <label className="grid gap-2 text-sm text-slate-200">资料摘录 / 课程文字稿<textarea required minLength={40} maxLength={30000} value={content} onChange={e=>setContent(e.target.value)} rows={10} placeholder="上传文件后会尝试填入可提取文字；也可以直接粘贴你有权使用的章节摘录或老师的文章/文字稿。建议每次处理一个有明确来源的片段。" className="resize-y rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500"/></label>
        <p className="text-xs leading-5 text-slate-400">PDF 只提取文字层，不包含扫描件 OCR；EPUB 按阅读顺序提取章节正文。请仅处理自己有权使用的资料，系统以原创摘要为主，不应替代原书或完整课程。</p>
        <button disabled={loading} className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60">{loading ? "正在蒸馏…" : "生成并保存知识卡片"}</button>
      </form>
      {result?.error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{result.error}</p>}
      {result && !result.error && <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 md:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">{result.title || sourceTitle}</h2><p className="mt-1 text-sm text-slate-400">{sourceType === "book" ? "书籍" : sourceType === "course" ? "教师文章 / 课程" : "笔记"} · {sourceLocation || "未提供页码或时间戳"}</p></div>{saved&&<span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200">已保存到本地知识库</span>}</div><pre className="mt-5 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-200">{result.markdown}</pre><Link href="/library" className="mt-5 inline-flex text-sm font-semibold text-cyan-300 underline">在知识库中查看 →</Link></section>}
      <div className="mt-7 text-sm text-slate-400">下一步：到 <Link href="/lesson-plans" className="text-cyan-300 underline">主题班会教案工坊</Link> 自动匹配相关知识。</div>
    </div>
  </main>;
}
