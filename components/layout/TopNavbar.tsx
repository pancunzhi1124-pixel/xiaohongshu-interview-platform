"use client";

import Link from "next/link";
import { useState } from "react";

type DropdownItem = {
  label: string;
  href: string;
  description: string;
};

type NavItem = {
  label: string;
  href: string;
  dropdown: DropdownItem[];
  wide?: boolean;
};

const navItems: NavItem[] = [
  {
    label: "首页",
    href: "/",
    dropdown: [
      { label: "平台介绍", href: "/#hero", description: "了解 AI 结构化模拟面试功能" },
      { label: "核心功能", href: "/#features", description: "查看平台功能亮点" },
    ],
  },
  {
    label: "浏览题库",
    href: "/banks",
    wide: true,
    dropdown: [
      { label: "国考面试", href: "/banks/national-civil-service", description: "国家公务员、税务、海关、边检等真题" },
      { label: "省考面试", href: "/banks/provincial-civil-service", description: "各省公务员、省直、市直、县区、选调生等真题" },
      { label: "事业编面试", href: "/banks/public-institution", description: "事业单位、教师、医疗、社工、高校辅导员等题目" },
      { label: "国企央企银行面试", href: "/banks/state-owned-enterprise", description: "国企、央企、银行、农商行、电网等题目" },
      { label: "私企民企面试", href: "/banks/private-company", description: "互联网、电商、运营、销售、客服、产品、技术等题目" },
    ],
  },
  {
    label: "模拟面试",
    href: "/interview",
    dropdown: [
      { label: "国考模拟", href: "/interview?bankId=national-civil-service", description: "进入国考结构化模拟" },
      { label: "省考模拟", href: "/interview?bankId=provincial-civil-service", description: "进入省考结构化模拟" },
      { label: "事业编模拟", href: "/interview?bankId=public-institution", description: "进入事业编模拟" },
      { label: "国企银行模拟", href: "/interview?bankId=state-owned-enterprise", description: "进入国企央企银行模拟" },
      { label: "私企求职模拟", href: "/interview?bankId=private-company", description: "进入企业招聘模拟" },
    ],
  },
  {
    label: "更新公告",
    href: "/announcements",
    dropdown: [
      { label: "全部公告", href: "/announcements", description: "查看全部更新公告" },
      { label: "地区考试", href: "/announcements?category=regional-exam", description: "查看各地区考试信息" },
      { label: "校园招聘", href: "/announcements?category=campus-recruitment", description: "查看高校校园招聘信息" },
    ],
  },
  {
    label: "使用说明",
    href: "/#features",
    dropdown: [
      { label: "如何浏览题库", href: "/#features", description: "了解题库筛选和查看答案" },
      { label: "如何开始模拟", href: "/#features", description: "了解 AI 模拟面试流程" },
      { label: "如何下载公告附件", href: "/announcements", description: "了解公告附件下载方式" },
    ],
  },
];

export default function TopNavbar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6 md:px-10">
        <Link href="/" className="shrink-0">
          <p className="text-sm font-semibold text-white md:text-base">AI 面试练习平台</p>
          <p className="text-xs text-slate-300">结构化面试题库</p>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-5 text-sm text-slate-200 md:flex lg:gap-7">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => setOpenMenu(item.label)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <Link href={item.href} className="inline-flex items-center gap-1 transition hover:text-cyan-300">
                {item.label}
                <span aria-hidden className="text-cyan-300/80">▾</span>
              </Link>

              <div className="absolute left-0 top-full z-50 h-3 w-full" aria-hidden />

              {openMenu === item.label && (
                <div
                  className={`absolute top-full z-50 rounded-2xl border border-cyan-300/20 bg-slate-950/95 p-3 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl ${
                    item.wide
                      ? "left-1/2 mt-3 w-[min(92vw,620px)] -translate-x-1/2"
                      : "left-1/2 mt-3 w-[320px] -translate-x-1/2"
                  }`}
                >
                  <div className={`grid gap-2 ${item.wide ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                    {item.dropdown.map((entry, idx) => (
                      <Link
                        key={entry.href}
                        href={entry.href}
                        className={`rounded-xl p-3 transition hover:bg-cyan-400/10 hover:text-cyan-200 ${
                          item.wide && idx === item.dropdown.length - 1 ? "sm:col-span-2" : ""
                        }`}
                      >
                        <p className="text-sm font-semibold text-white">{entry.label}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{entry.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/banks"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-cyan-300/60 hover:text-cyan-200 md:text-sm"
          >
            浏览题库
          </Link>
          <Link
            href="/interview"
            className="rounded-lg bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-3 py-2 text-xs font-semibold text-white md:text-sm"
          >
            开始模拟
          </Link>
        </div>
      </div>
    </header>
  );
}
