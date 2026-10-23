"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 後台導覽：目前所在的頁面以藍色底線＋粗體標示；「課程」底下有子分頁
const SECTIONS = [
  { href: "/admin/schedule", label: "課程", match: ["/admin/schedule", "/admin/courses", "/admin/sessions"] },
  { href: "/admin/members", label: "會員 / 堂數", match: ["/admin/members"] },
  { href: "/admin/coaches", label: "教練", match: ["/admin/coaches"] },
];

const COURSE_TABS = [
  { href: "/admin/schedule", label: "近期課程", exact: true },
  { href: "/admin/schedule/past", label: "過去紀錄", exact: false },
  { href: "/admin/courses", label: "常態課設定", exact: false },
];

const startsWith = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex h-full gap-1 text-sm">
      {SECTIONS.map((s) => {
        const active = s.match.some((m) => startsWith(path, m));
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center px-2.5 border-b-2 -mb-px ${
              active ? "border-brand text-brand font-bold" : "border-transparent text-gray-500 hover:text-brand"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** 課程區的子分頁（近期課程 / 過去紀錄 / 常態課設定） */
export function CourseTabs() {
  const path = usePathname();
  // 課程詳情（名單）頁不顯示子分頁
  if (!["/admin/schedule", "/admin/courses"].some((p) => startsWith(path, p))) return null;
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {COURSE_TABS.map((t) => {
        const active = t.exact ? path === t.href : startsWith(path, t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${
              active ? "bg-brand text-white font-bold" : "bg-white border border-gray-200 text-gray-600 hover:text-brand"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
