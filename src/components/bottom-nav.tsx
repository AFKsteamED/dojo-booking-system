"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
import type { DictKey } from "@/lib/i18n";

const TABS: { href: string; key: DictKey; icon: typeof CalendarIcon }[] = [
  { href: "/", key: "nav_schedule", icon: CalendarIcon },
  { href: "/bookings", key: "nav_bookings", icon: ListIcon },
  { href: "/credits", key: "nav_credits", icon: WalletIcon },
  { href: "/profile", key: "nav_profile", icon: UserIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t, profileComplete } = useLiff();
  if (!profileComplete) return null; // 註冊完成前不顯示導覽
  return (
    <nav
      className="sticky bottom-0 z-10 bg-surface border-t border-border"
      // 底部留出手機 gesture bar 的安全區，避免橫杠擋住選單
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-md grid grid-cols-4">
        {TABS.map(({ href, key, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 pt-2.5 pb-3.5 text-[11px] ${
                active ? "text-brand" : "text-muted"
              }`}
            >
              <Icon />
              <span>{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18M16 14h2" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}
