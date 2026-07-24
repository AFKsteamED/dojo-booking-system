"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { initLiff, type LiffProfile } from "@/lib/liff";
import { syncMember } from "@/lib/client-api";
import type { Member } from "@/lib/types";

type LiffContextValue = {
  profile: LiffProfile | null;
  member: Member | null;
  profileComplete: boolean;
  loading: boolean;
  error: string | null;
  isMock: boolean;
  /** 個人檔案更新後呼叫，讓全站拿到最新會員資料 */
  setMember: (m: Member, complete: boolean) => void;
};

const LiffContext = createContext<LiffContextValue>({
  profile: null,
  member: null,
  profileComplete: false,
  loading: true,
  error: null,
  isMock: false,
  setMember: () => {},
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

  const setMember = useCallback((m: Member, complete: boolean) => {
    setMemberState(m);
    setProfileComplete(complete);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { profile, isMock } = await initLiff();
        if (cancelled) return;
        setProfile(profile);
        setIsMock(isMock);
        // 確保會員存在於資料庫
        const { member, profileComplete } = await syncMember(
          profile.userId,
          profile.displayName
        );
        if (cancelled) return;
        setMemberState(member);
        setProfileComplete(profileComplete);
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted text-sm">載入中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <p className="text-sm text-red-500">連線失敗：{error}</p>
      </div>
    );
  }

  return (
    <LiffContext.Provider
      value={{ profile, member, profileComplete, loading, error, isMock, setMember }}
    >
      {children}
    </LiffContext.Provider>
  );
}
