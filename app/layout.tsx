import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "知心教研工作台｜心理知识蒸馏与主题班会教案",
  description: "整理心理学书籍与教师课程，将知识转化为可执行、可复盘、尊重学生的主题班会教案。",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
