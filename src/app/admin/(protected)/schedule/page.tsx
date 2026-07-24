"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";
import { toDateStr, shortDateTW, hhmm } from "@/lib/date-utils";

type AdminSession = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: string;
  coach_name: string | null;
  booked_count: number;
};

export default function AdminSchedulePage() {
  const [date, setDate] = useState(toDateStr(new Date()));
  const [sessions, setSessions] = useState<AdminSession[] | null>(null);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setSessions(null);
    adminApi.sessions(date).then((d) => setSessions(d.sessions)).catch(() => setSessions([]));
  }, [date]);
  useEffect(load, [load]);

  async function generate() {
    setBusy(true);
    setGenMsg(null);
    try {
      await adminApi.generateSessions(8);
      setGenMsg("已產生未來 8 週的常規課場次");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function cancelSession(id: string) {
    if (!confirm("確定停課？已預約的學員會自動退還堂數。")) return;
    await adminApi.cancelSession(id);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">課表 / 名單</h1>
        <button
          onClick={generate}
          disabled={busy}
          className="text-sm bg-brand text-white rounded-lg px-3 py-2 disabled:opacity-50"
        >
          產生未來 8 週場次
        </button>
      </div>
      {genMsg && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{genMsg}</p>}

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">日期</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <span className="text-sm text-gray-400">{shortDateTW(date)}</span>
      </div>

      <div className="space-y-3">
        {sessions === null && <p className="text-gray-400 text-sm py-6 text-center">載入中…</p>}
        {sessions?.length === 0 && (
          <p className="text-gray-400 text-sm py-6 text-center">這天沒有場次</p>
        )}
        {sessions?.map((s) => (
          <div
            key={s.id}
            className={`bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between ${
              s.status === "cancelled" ? "opacity-50" : ""
            }`}
          >
            <div>
              <p className="text-sm text-gray-500">
                {hhmm(s.start_time)} – {hhmm(s.end_time)} · {s.coach_name ?? "教練"}
              </p>
              <p className="font-bold">
                {s.title}
                {s.status === "cancelled" && (
                  <span className="ml-2 text-xs text-red-500">已停課</span>
                )}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                預約 {s.booked_count} / {s.capacity} 人
              </p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Link
                href={`/admin/sessions/${s.id}`}
                className="text-sm text-brand border border-brand/30 rounded-lg px-3 py-1.5"
              >
                看名單
              </Link>
              {s.status !== "cancelled" && (
                <button
                  onClick={() => cancelSession(s.id)}
                  className="text-xs text-red-500"
                >
                  停課
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
