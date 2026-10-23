"use client";

import { useEffect, useState, useCallback } from "react";
import { useLiff } from "@/components/liff-provider";
import { getMyBookings, cancelBooking, type MyBooking } from "@/lib/client-api";
import { messageForCode } from "@/lib/booking-errors";
import { hhmm, shortDate } from "@/lib/date-utils";
import { BOOKING_DEADLINE_HOURS } from "@/lib/session-status";
import { useNow } from "@/lib/use-now";

export default function BookingsPage() {
  const { profile, member, dependents, locale, t } = useLiff();
  const [viewingId, setViewingId] = useState<string | undefined>(undefined);
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  // 結果連同查詢條件一起存：條件變了、新結果還沒回來前顯示「載入中」
  const [result, setResult] = useState<{ key: string; list: MyBooking[] } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const now = useNow();
  const key = `${scope}|${viewingId ?? ""}|${reloadKey}`;
  const list = result?.key === key ? result.list : null;

  // 切換分頁/對象時，丟棄較晚回來的舊回應，避免畫面閃回上一個分頁的資料
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    getMyBookings(scope, viewingId)
      .then((l) => !cancelled && setResult({ key, list: l }))
      .catch(() => !cancelled && setResult({ key, list: [] }));
    return () => {
      cancelled = true;
    };
  }, [profile, scope, viewingId, key]);

  async function handleCancel(id: string) {
    if (!profile) return;
    if (!confirm(t("bookings_cancelConfirm"))) return;
    setMsg(null);
    try {
      await cancelBooking(id);
      setMsg({ ok: true, text: t("bookings_cancelSuccess") });
      reload();
    } catch (e) {
      setMsg({ ok: false, text: messageForCode((e as { code?: string }).code ?? "UNKNOWN", locale) });
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold">{t("bookings_title")}</h1>
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
        <Tab active={scope === "upcoming"} onClick={() => setScope("upcoming")}>
          {t("bookings_upcoming")}
        </Tab>
        <Tab active={scope === "past"} onClick={() => setScope("past")}>
          {t("bookings_ended")}
        </Tab>
      </div>

      {msg && (
        <p
          className={`mx-4 mb-2 text-center text-sm rounded-lg py-2 px-3 ${
            msg.ok ? "text-brand bg-brand/10" : "text-accent bg-accent/10"
          }`}
        >
          {msg.text}
        </p>
      )}

      {scope === "upcoming" && (
        <p className="mx-4 mb-2 text-[11px] text-muted text-center">{t("bookings_cancelPolicy")}</p>
      )}

      <div className="flex-1 px-4 space-y-3">
        {list === null && <p className="text-center text-muted text-sm py-10">{t("common_loading")}</p>}
        {list?.length === 0 && (
          <p className="text-center text-muted text-sm py-10">
            {scope === "upcoming" ? t("bookings_noUpcoming") : t("bookings_noEnded")}
          </p>
        )}
        {list?.map((b) => {
          const canCancel = b.startMs - BOOKING_DEADLINE_HOURS * 3600_000 > now;
          return (
          <div key={b.id} className="bg-surface border border-border rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted">
                  {shortDate(b.session_date, locale)} {hhmm(b.start_time)} – {hhmm(b.end_time)}
                </p>
                <p className="font-bold mt-0.5">{b.title}</p>
                <p className="text-sm text-muted mt-0.5">{b.coach_name ?? t("session_coach")}</p>
              </div>
              <StatusBadge status={b.sessionCancelled ? "session_cancelled" : b.status} />
            </div>
            {scope === "upcoming" && b.status === "booked" && canCancel && (
              <button
                onClick={() => handleCancel(b.id)}
                className="mt-3 w-full text-sm text-red-500 border border-red-200 rounded-xl py-2"
              >
                {t("bookings_cancelButton")}
              </button>
            )}
          </div>
          );
        })}
      </div>
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

function StatusBadge({ status }: { status: string }) {
  const { t } = useLiff();
  const map: Record<string, { key: Parameters<typeof t>[0]; cls: string }> = {
    booked: { key: "bookings_status_booked", cls: "bg-brand/10 text-brand" },
    cancelled: { key: "bookings_status_cancelled", cls: "bg-gray-100 text-gray-400" },
    attended: { key: "bookings_status_attended", cls: "bg-green-100 text-green-600" },
    no_show: { key: "bookings_status_no_show", cls: "bg-red-100 text-red-500" },
    session_cancelled: { key: "schedule_cancelled", cls: "bg-gray-100 text-gray-500" },
  };
  const m = map[status] ?? map.booked;
  return <span className={`shrink-0 text-xs px-2 py-1 rounded-full ${m.cls}`}>{t(m.key)}</span>;
}
