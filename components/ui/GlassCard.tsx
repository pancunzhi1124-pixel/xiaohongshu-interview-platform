import type { PropsWithChildren } from "react";

export default function GlassCard({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <div className={`rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl ${className}`}>{children}</div>;
}
