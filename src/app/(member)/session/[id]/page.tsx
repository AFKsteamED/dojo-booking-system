"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
import { getSessionDetail, createBooking } from "@/lib/client-api";
import { messageForCode } from "@/lib/booking-errors";
import { hhmm, shortDateTW } from "@/lib/date-utils";
import type { SessionWithCounts } from "@/lib/types";

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { profile, profileComplete } = useLiff();

  const [data, setData] = useState<{
    session: SessionWithCounts;
    roster: string[];
    myBooked: boolean;
    myCredits: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    if (!profile) return;
    getSessionDetail(id).then(setData).catch(() => setData(null));
  };
  useEffect(load, [id, profile]);

  async function handleBook() {
    if (!profile) return;
    if (!profileComplete) {
      setMsg("請先到「個人檔案」填寫電話");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await createBooking(id);
      setMsg("預約成功！");
      load();
    } catch (e) {
      setMsg(messageForCode((e as { code?: string }).code ?? "UNKNOWN"));
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <p className="text-center text-muted text-sm py-16">載入中…</p>;
  const s = data.session;

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-4 py-3 border-b border-border flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted text-xl">‹</button>
        <h1 className="font-bold">{s.title}</h1>
        {s.visibility === "private" && (
          <span className="text-[11px] bg-accent/10 text-accent rounded-full px-2 py-0.5">
            私人課
          </span>
        )}
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-2 text-sm">
          <Row label="時間" value={`${shortDateTW(s.session_date)} ${hhmm(s.start_time)} – ${hhmm(s.end_time)}`} />
          <Row label="教練" value={s.coach_name ?? "教練"} />
          <Row label="地點" value="真實格鬥" />
          <Row label="剩餘名額" value={s.remaining > 0 ? `${s.remaining} 位` : "已滿"} />
        </div>

        <div className="bg-surface border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold mb-2">
            目前預約名單（{data.roster.length}）
          </p>
          {data.roster.length === 0 ? (
            <p className="text-muted text-sm">還沒有人預約</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.roster.map((name, i) => (
                <span key={i} className="text-xs bg-brand/10 text-brand rounded-full px-3 py-1">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted text-center">
          我的{s.visibility === "private" ? "私人" : "團體"}堂數：{data.myCredits} 堂 · 預約將扣 1 堂
        </p>

        {msg && (
          <p className="text-center text-sm text-brand bg-brand/10 rounded-lg py-2">{msg}</p>
        )}
      </div>

      {/* 底部動作按鈕 */}
      <div className="mt-auto p-4">
        {data.myBooked ? (
          <div className="text-center text-sm text-muted">
            你已預約這堂課，若要取消請至「我的預約」
          </div>
        ) : (
          <button
            disabled={busy || s.remaining <= 0}
            onClick={handleBook}
            className="w-full rounded-2xl bg-brand text-brand-ink py-4 font-bold shadow-card hover:bg-brand-strong disabled:opacity-50 disabled:hover:bg-brand"
          >
            {s.remaining <= 0 ? "已額滿" : busy ? "處理中…" : "立即預約（扣 1 堂）"}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
