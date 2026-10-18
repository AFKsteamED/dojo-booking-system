"use client";

import { useEffect, useState, useCallback } from "react";
import { useLiff } from "@/components/liff-provider";
import { getMyBookings, cancelBooking, type MyBooking } from "@/lib/client-api";
import { messageForCode } from "@/lib/booking-errors";
import { hhmm, shortDate } from "@/lib/date-utils";

export default function BookingsPage() {
  const { profile, member, dependents, locale, t } = useLiff();
  const [viewingId, setViewingId] = useState<string | undefined>(undefined);
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const [list, setList] = useState<MyBooking[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!profile) return;
    setList(null);
    getMyBookings(scope, viewingId)
      .then(setList)
      .catch(() => setList([]));
  }, [profile, scope, viewingId]);

  useEffect(load, [load]);

  async function handleCancel(id: string) {
    if (!profile) return;
    if (!confirm(t("bookings_cancelConfirm"))) return;
    setMsg(null);
    try {
      await cancelBooking(id);
      setMsg(t("bookings_cancelSuccess"));
      load();
    } catch (e) {
      setMsg(messageForCode((e as { code?: string }).code ?? "UNKNOWN", locale));
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
        <p className="mx-4 mb-2 text-center text-sm text-brand bg-brand/10 rounded-lg py-2">
          {msg}
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
        {list?.map((b) => (
          <div key={b.id} className="bg-surface border border-border rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted">
                  {shortDate(b.session_date, locale)} {hhmm(b.start_time)} – {hhmm(b.end_time)}
                </p>
                <p className="font-bold mt-0.5">{b.title}</p>
                <p className="text-sm text-muted mt-0.5">{b.coach_name ?? t("session_coach")}</p>
              </div>
              <StatusBadge status={b.status} />
            </div>
            {scope === "upcoming" && b.status === "booked" && (
              <button
                onClick={() => handleCancel(b.id)}
                className="mt-3 w-full text-sm text-red-500 border border-red-200 rounded-xl py-2"
              >
                {t("bookings_cancelButton")}
              </button>
            )}
          </div>
        ))}
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
  };
  const m = map[status] ?? map.booked;
  return <span className={`text-xs px-2 py-1 rounded-full ${m.cls}`}>{t(m.key)}</span>;
}
