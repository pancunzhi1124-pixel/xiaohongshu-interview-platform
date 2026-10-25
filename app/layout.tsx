import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "主题班会教案工作台｜心理学与课程知识蒸馏",
  description: "把心理学书籍与教师课程转化为可追溯的教学知识，再生成有目标、有流程、有话术、可落地的主题班会教案。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
