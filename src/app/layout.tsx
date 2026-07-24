import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "真實格鬥 | 課程預約",
  description: "真實格鬥道館 — 課程預約、剩餘堂數、預約紀錄、個人檔案",
};

// LIFF 是全螢幕行動網頁：鎖定寬度、禁止使用者縮放，體驗才像 App
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1546a5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant-TW" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
