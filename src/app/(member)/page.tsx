"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSessions } from "@/lib/client-api";
import { nextNDays, weekdayTW, hhmm } from "@/lib/date-utils";
import type { SessionWithCounts } from "@/lib/types";

export default function SchedulePage() {
  const days = nextNDays(21);
  const [selected, setSelected] = useState(days[0]);
  const [sessions, setSessions] = useState<SessionWithCounts[] | null>(null);

  useEffect(() => {
    setSessions(null);
    getSessions(selected, selected)
      .then(setSessions)
      .catch(() => setSessions([]));
  }, [selected]);

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-4 pt-4 pb-2">
        <p className="text-brand font-extrabold tracking-widest text-xs">REAL FIGHTING</p>
        <h1 className="text-xl font-bold">課程預約</h1>
      </header>

      {/* 日期橫向選擇 */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
        {days.map((d) => {
          const active = d === selected;
          const [, , day] = d.split("-");
          return (
            <button
              key={d}
              onClick={() => setSelected(d)}
              className={`flex flex-col items-center shrink-0 w-12 py-2 rounded-xl border ${
                active
                  ? "bg-brand text-brand-ink border-brand"
                  : "bg-surface text-foreground border-border"
              }`}
            >
              <span className="text-[11px]">{weekdayTW(d)}</span>
              <span className="text-lg font-bold leading-none mt-1">{Number(day)}</span>
            </button>
          );
        })}
      </div>

      {/* 場次清單 */}
      <div className="flex-1 px-4 py-2 space-y-3">
        {sessions === null && <p className="text-center text-muted text-sm py-10">載入中…</p>}
        {sessions?.length === 0 && (
          <p className="text-center text-muted text-sm py-10">這天沒有課程</p>
        )}
        {sessions?.map((s) => (
          <Link
            key={s.id}
            href={`/session/${s.id}`}
            className="block bg-surface border border-border rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">
                  {hhmm(s.start_time)} – {hhmm(s.end_time)}
                </p>
                <p className="font-bold text-base mt-0.5">{s.title}</p>
                <p className="text-sm text-muted mt-0.5">{s.coach_name ?? "教練"}</p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block text-xs px-2 py-1 rounded-full ${
                    s.remaining > 0
                      ? "bg-brand/10 text-brand"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {s.remaining > 0 ? `剩 ${s.remaining} 位` : "已滿"}
                </span>
                <p className="text-[11px] text-muted mt-1">
                  {s.booked_count}/{s.capacity} 人
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
