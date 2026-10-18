"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { initLiff, type LiffProfile } from "@/lib/liff";
import { syncMember, getHousehold, setLocale as apiSetLocale } from "@/lib/client-api";
import { t as translate, type Locale, type DictKey } from "@/lib/i18n";
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
    (async () => {
      try {
        const { profile, isMock, idToken } = await initLiff();
        if (cancelled) return;
        setProfile(profile);
        setIsMock(isMock);
        // 用 LINE 身分驗證（或開發假身分）同步會員並取得 session
        const { member, profileComplete } = await syncMember({ idToken });
        if (cancelled) return;
        setMemberState(member);
        setProfileComplete(profileComplete);
        if (member.locale) setLocaleState(member.locale);
        setLoading(false);
        // 家人清單非同步補載，不擋主流程
        getHousehold()
          .then((d) => {
            if (!cancelled) setDependents(d.dependents);
          })
          .catch(() => {});
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted text-sm">載入中… Loading…</p>
      </div>
    );
  }

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
