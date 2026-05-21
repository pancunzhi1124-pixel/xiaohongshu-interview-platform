import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import TopNavbar from "@/components/layout/TopNavbar";

export const metadata: Metadata = {
  title: "多类型 AI 视频感模拟面试",
  description: "多类型面试题库 + AI 评分 + 追问 + 报告",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-slate-950 text-white">
        <TopNavbar />
        {children}
      </body>
    </html>
  );
}
