"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { initLiff, type LiffProfile } from "@/lib/liff";
import { syncMember, getHousehold, setLocale as apiSetLocale } from "@/lib/client-api";
import { t as translate, type Locale, type DictKey } from "@/lib/i18n";
import { prefetchSchedule } from "@/lib/schedule-prefetch";
import type { Member } from "@/lib/types";

type LiffContextValue = {
  profile: LiffProfile | null;
  member: Member | null;
  profileComplete: boolean;
  loading: boolean;
  error: string | null;
  isMock: boolean;
  /** 我自己 + 我的小孩 */
  dependents: Member[];
  reloadHousehold: () => void;
  /** 個人檔案更新後呼叫，讓全站拿到最新會員資料 */
  setMember: (m: Member, complete: boolean) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
};

const LiffContext = createContext<LiffContextValue>({
  profile: null,
  member: null,
  profileComplete: false,
  loading: true,
  error: null,
  isMock: false,
  dependents: [],
  reloadHousehold: () => {},
  setMember: () => {},
  locale: "zh",
  setLocale: () => {},
  t: (key) => key,
});

export function useLiff() {
  return useContext(LiffContext);
}

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [member, setMemberState] = useState<Member | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dependents, setDependents] = useState<Member[]>([]);
  const [locale, setLocaleState] = useState<Locale>("zh");

  const setMember = useCallback((m: Member, complete: boolean) => {
    setMemberState(m);
    setProfileComplete(complete);
    if (m.locale) setLocaleState(m.locale);
  }, []);

  const reloadHousehold = useCallback(() => {
    getHousehold()
      .then((d) => setDependents(d.dependents))
      .catch(() => {});
  }, []);

  const handleSetLocale = useCallback((l: Locale) => {
    setLocaleState(l); // 立即切換畫面，不等 API
    apiSetLocale(l).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    // 要進課表頁時，趁 LINE 初始化、登入同步的空檔先抓課表（回訪會員可直接使用）
    if (isOpeningSchedule()) prefetchSchedule();
    (async () => {
      try {
        const { profile, isMock, idToken, lang } = await initLiff();
        if (cancelled) return;
        setProfile(profile);
        setIsMock(isMock);
        // 用 LINE 身分驗證（或開發假身分）同步會員並取得 session；
        // 新會員依 LINE App 語言自動預設中/英
        // 同步時一併帶回代管成員，不必再查一次
        const { member, profileComplete, dependents } = await syncMember({ idToken, lang });
        if (cancelled) return;
        setMemberState(member);
        setProfileComplete(profileComplete);
        setDependents(dependents ?? []);
        if (member.locale) setLocaleState(member.locale);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "初始化失敗");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const t = useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <p className="text-sm text-red-500">連線失敗 Connection failed：{error}</p>
      </div>
    );
  }

  return (
    <LiffContext.Provider
      value={{
        profile,
        member,
        profileComplete,
        loading,
        error,
        isMock,
        dependents,
        reloadHousehold,
        setMember,
        locale,
        setLocale: handleSetLocale,
        t,
      }}
    >
      {children}
    </LiffContext.Provider>
  );
}

// 直接開課表（含 LINE 圖文選單的預設入口）才預先載入；
// 從 LIFF 深層連結進來（?liff.state=/bookings 等）會被導到別頁，就不必抓。
function isOpeningSchedule(): boolean {
  if (typeof window === "undefined" || window.location.pathname !== "/") return false;
  const target = new URLSearchParams(window.location.search).get("liff.state");
  return !target || target === "/" || target.startsWith("/?");
}

// 載入中先畫出課表的骨架，讓畫面不是一片空白
function LoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse" aria-busy="true">
      <span className="sr-only">載入中… Loading…</span>
      <div className="px-4 pt-5 pb-3 space-y-2">
        <div className="h-3 w-24 rounded bg-brand/15" />
        <div className="h-7 w-36 rounded bg-gray-200" />
      </div>
      <div className="flex gap-2 px-4 pb-3 overflow-hidden">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="shrink-0 w-12 h-[60px] rounded-xl bg-surface border border-border" />
        ))}
      </div>
      <div className="px-4 py-2 space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-[92px] rounded-2xl bg-surface border border-border" />
        ))}
      </div>
    </div>
  );
}
