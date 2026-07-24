"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { getCredits } from "@/lib/client-api";
import type { CreditWallet } from "@/lib/types";

export default function CreditsPage() {
  const { profile } = useLiff();
  const [tab, setTab] = useState<"available" | "expired">("available");
  const [data, setData] = useState<{
    available: CreditWallet[];
    expired: CreditWallet[];
  } | null>(null);

  useEffect(() => {
    if (!profile) return;
    getCredits(profile.userId)
      .then(setData)
      .catch(() => setData({ available: [], expired: [] }));
  }, [profile]);

  const list = data ? data[tab] : null;

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold">剩餘堂數</h1>
      </header>

      <div className="flex gap-2 px-4 pb-3">
        <Tab active={tab === "available"} onClick={() => setTab("available")}>
          可使用
        </Tab>
        <Tab active={tab === "expired"} onClick={() => setTab("expired")}>
          已失效
        </Tab>
      </div>

      <div className="flex-1 px-4 space-y-3">
        {list === null && <p className="text-center text-muted text-sm py-10">載入中…</p>}
        {list?.length === 0 && (
          <p className="text-center text-muted text-sm py-10">
            {tab === "available" ? "目前沒有可用堂數" : "沒有已失效的堂數"}
          </p>
        )}
        {list?.map((w) => (
          <div key={w.id} className="bg-surface border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold">
                {w.type === "group" ? "團體課程堂數" : "私人教練堂數"}
              </p>
              <p className="text-brand font-bold text-lg">
                剩 {w.remaining_credits}
                <span className="text-xs text-muted font-normal"> / {w.total_credits} 堂</span>
              </p>
            </div>
            <p className="text-xs text-muted mt-2">
              有效期：{w.valid_from} ~ {w.valid_to}
            </p>
            {w.note && <p className="text-xs text-muted mt-1">備註：{w.note}</p>}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted p-4">
        堂數由道館後台儲值，如需購買請洽櫃檯或教練
      </p>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-full text-sm font-medium ${
        active ? "bg-brand text-brand-ink" : "bg-surface text-muted border border-border"
      }`}
    >
      {children}
    </button>
  );
}
