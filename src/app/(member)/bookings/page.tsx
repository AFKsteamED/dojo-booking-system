"use client";

import { useEffect, useState, useCallback } from "react";
import { useLiff } from "@/components/liff-provider";
import { getMyBookings, cancelBooking, type MyBooking } from "@/lib/client-api";
import { messageForCode } from "@/lib/booking-errors";
import { hhmm, shortDateTW } from "@/lib/date-utils";

export default function BookingsPage() {
  const { profile } = useLiff();
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const [list, setList] = useState<MyBooking[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!profile) return;
    setList(null);
    getMyBookings(profile.userId, scope)
      .then(setList)
      .catch(() => setList([]));
  }, [profile, scope]);

  useEffect(load, [load]);

  async function handleCancel(id: string) {
    if (!profile) return;
    if (!confirm("確定要取消這筆預約嗎？")) return;
    setMsg(null);
    try {
      await cancelBooking(profile.userId, id);
      setMsg("已取消，堂數已退回");
      load();
    } catch (e) {
      setMsg(messageForCode((e as { code?: string }).code ?? "UNKNOWN"));
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold">我的預約</h1>
      </header>

      <div className="flex gap-2 px-4 pb-3">
        <Tab active={scope === "upcoming"} onClick={() => setScope("upcoming")}>
          預約中
        </Tab>
        <Tab active={scope === "past"} onClick={() => setScope("past")}>
          已結束
        </Tab>
      </div>

      {msg && (
        <p className="mx-4 mb-2 text-center text-sm text-brand bg-brand/10 rounded-lg py-2">
          {msg}
        </p>
      )}

      <div className="flex-1 px-4 space-y-3">
        {list === null && <p className="text-center text-muted text-sm py-10">載入中…</p>}
        {list?.length === 0 && (
          <p className="text-center text-muted text-sm py-10">
            {scope === "upcoming" ? "目前沒有預約中的課程" : "沒有已結束的預約"}
          </p>
        )}
        {list?.map((b) => (
          <div key={b.id} className="bg-surface border border-border rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted">
                  {shortDateTW(b.session_date)} {hhmm(b.start_time)} – {hhmm(b.end_time)}
                </p>
                <p className="font-bold mt-0.5">{b.title}</p>
                <p className="text-sm text-muted mt-0.5">{b.coach_name ?? "教練"}</p>
              </div>
              <StatusBadge status={b.status} />
            </div>
            {scope === "upcoming" && b.status === "booked" && (
              <button
                onClick={() => handleCancel(b.id)}
                className="mt-3 w-full text-sm text-red-500 border border-red-200 rounded-xl py-2"
              >
                取消預約
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
  const map: Record<string, { label: string; cls: string }> = {
    booked: { label: "預約中", cls: "bg-brand/10 text-brand" },
    cancelled: { label: "已取消", cls: "bg-gray-100 text-gray-400" },
    attended: { label: "已報到", cls: "bg-green-100 text-green-600" },
    no_show: { label: "未到", cls: "bg-red-100 text-red-500" },
  };
  const m = map[status] ?? map.booked;
  return <span className={`text-xs px-2 py-1 rounded-full ${m.cls}`}>{m.label}</span>;
}
