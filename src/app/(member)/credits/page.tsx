"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { getCredits } from "@/lib/client-api";
import type { CreditWallet } from "@/lib/types";

export default function CreditsPage() {
  const { profile, member, dependents, t } = useLiff();
  const [viewingId, setViewingId] = useState<string | undefined>(undefined);
  const [tab, setTab] = useState<"available" | "expired">("available");
  const [data, setData] = useState<{
    available: CreditWallet[];
    expired: CreditWallet[];
  } | null>(null);

  useEffect(() => {
    if (!profile) return;
    setData(null);
    getCredits(viewingId)
      .then(setData)
      .catch(() => setData({ available: [], expired: [] }));
  }, [profile, viewingId]);

  const list = data ? data[tab] : null;

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold">{t("credits_title")}</h1>
      </header>

      {dependents.length > 0 && (
        <div className="px-4 pb-2">
          <label className="text-xs text-muted">{t("bookings_viewing")}</label>
          <select
            value={viewingId ?? ""}
            onChange={(e) => setViewingId(e.target.value || undefined)}
            className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface"
          >
            <option value="">{t("session_self")}（{member?.display_name}）</option>
            {dependents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.display_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 px-4 pb-3">
        <Tab active={tab === "available"} onClick={() => setTab("available")}>
          {t("credits_available")}
        </Tab>
        <Tab active={tab === "expired"} onClick={() => setTab("expired")}>
          {t("credits_expired")}
        </Tab>
      </div>

      <div className="flex-1 px-4 space-y-3">
        {list === null && <p className="text-center text-muted text-sm py-10">{t("common_loading")}</p>}
        {list?.length === 0 && (
          <p className="text-center text-muted text-sm py-10">
            {tab === "available" ? t("credits_noAvailable") : t("credits_noExpired")}
          </p>
        )}
        {list?.map((w) => (
          <div key={w.id} className="bg-surface border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold">
                {w.type === "group" ? t("credits_group") : t("credits_private")}
              </p>
              <p className="text-brand font-bold text-lg">
                {t("credits_remaining", { remaining: w.remaining_credits })}
                <span className="text-xs text-muted font-normal">
                  {t("credits_ofTotal", { total: w.total_credits })}
                </span>
              </p>
            </div>
            <p className="text-xs text-muted mt-2">
              {t("credits_validPeriod", { from: w.valid_from, to: w.valid_to })}
            </p>
            {w.note && <p className="text-xs text-muted mt-1">{t("credits_note", { note: w.note })}</p>}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted p-4">{t("credits_footer")}</p>
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
