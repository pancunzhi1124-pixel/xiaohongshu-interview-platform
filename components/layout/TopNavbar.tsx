import Link from "next/link";

const navItems = [
  { label: "首页", href: "/" },
  { label: "浏览题库", href: "/#banks" },
  { label: "模拟面试", href: "/interview" },
  { label: "更新公告", href: "/announcements" },
  { label: "使用说明", href: "/#usage-guide" },
];

export default function TopNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6 md:px-10">
        <Link href="/" className="shrink-0">
          <p className="text-sm font-semibold text-white md:text-base">AI 面试练习平台</p>
          <p className="text-xs text-slate-300">结构化面试题库</p>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-5 text-sm text-slate-200 md:flex lg:gap-7">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="transition hover:text-cyan-300">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/#banks"
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
      <nav className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-6 pb-3 text-xs text-slate-300 md:hidden md:px-10">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href} className="whitespace-nowrap transition hover:text-cyan-300">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
