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
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    if (!profile) return;
    getSessionDetail(id)
      .then((d) => {
        setData(d);
        setLoadError(null);
      })
      .catch((e) => {
        const code = (e as { code?: string }).code;
        setLoadError(
          code === "NOT_ELIGIBLE"
            ? "這是私人課程，你不在參與名單中"
            : code === "SESSION_NOT_FOUND"
              ? "找不到這堂課"
              : "無法載入課程資訊"
        );
      });
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

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-sm text-muted">{loadError}</p>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-brand border border-brand/30 rounded-xl px-4 py-2"
        >
          回課表
        </button>
      </div>
    );
  }
  if (!data) return <p className="text-center text-muted text-sm py-16">載入中…</p>;
  const s = data.session;

  // 預約前先判斷能不能約，直接顯示原因（不用點了才失敗）
  const startMs = new Date(`${s.session_date}T${s.start_time}+08:00`).getTime();
  const isPast = startMs <= Date.now();
  const creditLabel = s.visibility === "private" ? "私人" : "團體";
  const blockReason = data.myBooked
    ? null
    : isPast
      ? "已過預約時間"
      : s.remaining <= 0
        ? "已額滿"
        : !profileComplete
          ? "請先完成個人檔案（電話）"
          : data.myCredits <= 0
            ? `${creditLabel}堂數不足，請洽櫃檯儲值`
            : null;

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
        ) : blockReason ? (
          <div className="w-full rounded-2xl bg-gray-100 text-gray-400 py-4 font-bold text-center">
            {blockReason}
          </div>
        ) : (
          <button
            disabled={busy}
            onClick={handleBook}
            className="w-full rounded-2xl bg-brand text-brand-ink py-4 font-bold shadow-card hover:bg-brand-strong disabled:opacity-50 disabled:hover:bg-brand"
          >
            {busy ? "處理中…" : "立即預約（扣 1 堂）"}
          </button>
        )}
        <p className="text-[11px] text-muted text-center mt-3">
          預約後如需取消，請於<span className="text-accent">開課前 3 小時</span>完成；逾時將無法取消、不退堂。
        </p>
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
