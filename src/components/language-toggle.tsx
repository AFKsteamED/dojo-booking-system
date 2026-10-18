"use client";

import { useLiff } from "@/components/liff-provider";

// 固定在右上角的語言切換（中/EN）。不需要看得懂中文也能操作——
// 這是外籍生/家長第一眼進站時唯一需要懂的按鈕。
export function LanguageToggle() {
  const { locale, setLocale } = useLiff();
  const next = locale === "zh" ? "en" : "zh";
  return (
    <button
      onClick={() => setLocale(next)}
      aria-label="Switch language"
      className="fixed top-3 right-3 z-20 bg-surface border border-border rounded-full px-3 py-1.5 text-xs font-semibold text-muted shadow-card"
    >
      {locale === "zh" ? "EN" : "中"}
    </button>
  );
}
