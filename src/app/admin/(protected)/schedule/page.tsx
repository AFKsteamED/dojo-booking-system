"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";
import { shortDateTW, hhmm } from "@/lib/date-utils";

type AdminSession = {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: string;
  visibility: "public" | "private";
  coach_name: string | null;
  booked_count: number;
};

export default function AdminSchedulePage() {
  const [sessions, setSessions] = useState<AdminSession[] | null>(null);
  const [limit, setLimit] = useState(7);

  const load = useCallback(() => {
    setSessions(null);
    adminApi.upcoming(limit).then((d) => setSessions(d.sessions)).catch(() => setSessions([]));
  }, [limit]);
  useEffect(load, [load]);

  async function cancelSession(id: string) {
    if (!confirm("確定停課？已預約的學員會自動退還堂數。")) return;
    await adminApi.cancelSession(id);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">近期課程</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/courses"
            className="text-sm border border-gray-300 text-gray-600 rounded-lg px-3 py-2"
          >
            常態課／名單
          </Link>
          <Link
            href="/admin/courses/new"
            className="text-sm bg-brand text-white rounded-lg px-3 py-2 hover:bg-brand-strong"
          >
            ＋ 新增課程
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {sessions === null && <p className="text-gray-400 text-sm py-6 text-center">載入中…</p>}
        {sessions?.length === 0 && (
          <p className="text-gray-400 text-sm py-6 text-center">近期沒有課程</p>
        )}
        {sessions?.map((s) => (
          <div
            key={s.id}
            className={`bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between ${
              s.status === "cancelled" ? "opacity-50" : ""
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">{shortDateTW(s.session_date)}</p>
                <VisBadge v={s.visibility} />
              </div>
              <p className="font-bold mt-0.5">{s.title}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {hhmm(s.start_time)} – {hhmm(s.end_time)} · {s.coach_name ?? "教練"} · 預約{" "}
                {s.booked_count}/{s.capacity} 人
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
                <button onClick={() => cancelSession(s.id)} className="text-xs text-accent">
                  停課
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {sessions && sessions.length >= limit && (
        <button
          onClick={() => setLimit((n) => n + 7)}
          className="w-full text-sm text-gray-500 border border-gray-200 rounded-lg py-2"
        >
          顯示更多
        </button>
      )}
    </div>
  );
}

function VisBadge({ v }: { v: "public" | "private" }) {
  return v === "private" ? (
    <span className="text-[11px] bg-accent/10 text-accent rounded-full px-2 py-0.5">私人</span>
  ) : (
    <span className="text-[11px] bg-brand/10 text-brand rounded-full px-2 py-0.5">公開</span>
  );
}
