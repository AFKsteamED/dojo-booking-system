"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSessions } from "@/lib/client-api";
import { Wordmark } from "@/components/wordmark";
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
      <header className="px-4 pt-5 pb-3">
        <Wordmark className="text-[11px]" />
        <h1 className="text-2xl font-extrabold mt-1 flex items-center gap-2">
          課程預約
          <span className="h-5 w-1 rounded-full bg-accent inline-block" />
        </h1>
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
            className="block bg-surface border border-border rounded-2xl p-4 shadow-card hover:-translate-y-0.5 hover:border-brand/40 active:translate-y-0"
          >
            <div className="flex items-stretch justify-between gap-3">
              {/* 左側藍色時段色條 */}
              <div className="flex items-stretch gap-3">
                <span className="w-1 rounded-full bg-brand/80 shrink-0" />
                <div>
                  <p className="text-sm text-muted tabular-nums">
                    {hhmm(s.start_time)} – {hhmm(s.end_time)}
                  </p>
                  <p className="font-bold text-base mt-0.5">{s.title}</p>
                  <p className="text-sm text-muted mt-0.5">{s.coach_name ?? "教練"}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <SeatBadge remaining={s.remaining} />
                <p className="text-[11px] text-muted mt-1 tabular-nums">
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

// 名額徽章：充足=藍、剩 3 位內=紅（提醒把握）、額滿=灰
function SeatBadge({ remaining }: { remaining: number }) {
  if (remaining <= 0) {
    return (
      <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">
        已滿
      </span>
    );
  }
  const low = remaining <= 3;
  return (
    <span
      className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
        low ? "bg-accent/10 text-accent" : "bg-brand/10 text-brand"
      }`}
    >
      剩 {remaining} 位
    </span>
  );
}
