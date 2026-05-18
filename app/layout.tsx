import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xiaohongshu Interview Platform",
  description: "Next.js app bootstrap for deployment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
