import Link from "next/link";

const navItems = [
  { label: "首页", href: "#top" },
  { label: "浏览题库", href: "#banks" },
  { label: "模拟面试", href: "/interview" },
  { label: "更新公告", href: "#announcement" },
  { label: "使用说明", href: "#features" },
];

export default function HomeNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white md:text-base">AI 面试练习平台</p>
          <p className="hidden text-xs text-cyan-200/90 md:block">结构化面试题库</p>
        </div>

        <nav className="hidden items-center gap-5 text-sm text-slate-200 lg:flex">
          {navItems.map((item) =>
            item.href.startsWith("/") ? (
              <Link key={item.label} href={item.href} className="transition-colors hover:text-cyan-300">
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} className="transition-colors hover:text-cyan-300">
                {item.label}
              </a>
            ),
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <a href="#banks" className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 md:text-sm">
            浏览题库
          </a>
          <Link
            href="/interview"
            className="rounded-lg bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-3 py-2 text-xs font-semibold text-white md:text-sm"
          >
            立即开始模拟
          </Link>
        </div>
      </div>
    </header>
  );
}
