import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "多类型 AI 视频感模拟面试",
  description: "多类型面试题库 + AI 评分 + 追问 + 报告",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
