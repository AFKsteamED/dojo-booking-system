"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSessions } from "@/lib/client-api";
import { Wordmark } from "@/components/wordmark";
import { useLiff } from "@/components/liff-provider";
import { weekdayLabel, hhmm } from "@/lib/date-utils";
import { scheduleDays, takePrefetchedSchedule } from "@/lib/schedule-prefetch";
import { sessionState, type SessionState } from "@/lib/session-status";
import { useNow } from "@/lib/use-now";
import type { SessionWithCounts } from "@/lib/types";

export default function SchedulePage() {
  const { t, locale, member } = useLiff();
  const memberId = member?.id ?? null;
  const [days] = useState(scheduleDays);
  const [selected, setSelected] = useState(days[0]);
  const [all, setAll] = useState<SessionWithCounts[] | null>(null);

  // 一次載入三週課表，切換日期只在前端篩選：
  // 不會因為連點日期、舊的回應較晚回來而閃現別天的課程。
  // 開啟 App 時已預先載入（見 schedule-prefetch.ts）；是以本人身分查的才直接用，否則重新抓。
  useEffect(() => {
    let cancelled = false;
    const [from, to] = [days[0], days[days.length - 1]];
    const fresh = () => getSessions(from, to);
    const prefetched = takePrefetchedSchedule(from, to);
    const load = prefetched
      ? prefetched.then((r) => (r.viewer === memberId ? r : fresh()), fresh)
      : fresh();
    load
      .then((r) => !cancelled && setAll(r.sessions))
      .catch(() => !cancelled && setAll([]));
    return () => {
      cancelled = true;
    };
  }, [days, memberId]);

  const byDate = useMemo(() => {
    const m = new Map<string, SessionWithCounts[]>();
    for (const s of all ?? []) {
      const list = m.get(s.session_date) ?? [];
      list.push(s);
      m.set(s.session_date, list);
    }
    return m;
  }, [all]);

  const sessions = all === null ? null : byDate.get(selected) ?? [];
  const now = useNow();

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-4 pt-5 pb-3">
        <Wordmark className="text-[11px]" />
        <h1 className="text-2xl font-extrabold mt-1 flex items-center gap-2">
          {t("schedule_title")}
          <span className="h-5 w-1 rounded-full bg-accent inline-block" />
        </h1>
      </header>

      {/* 日期橫向選擇；有課的日子下方有小圓點 */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
        {days.map((d) => {
          const active = d === selected;
          const hasClass = byDate.has(d);
          const [, , day] = d.split("-");
          return (
            <button
              key={d}
              onClick={() => setSelected(d)}
              aria-pressed={active}
              className={`flex flex-col items-center shrink-0 w-12 pt-2 pb-1.5 rounded-xl border ${
                active ? "bg-brand text-brand-ink border-brand" : "bg-surface text-foreground border-border"
              }`}
            >
              <span className="text-[11px]">{weekdayLabel(d, locale)}</span>
              <span className="text-lg font-bold leading-none mt-1">{Number(day)}</span>
              <span
                className={`mt-1 h-1 w-1 rounded-full ${
                  hasClass ? (active ? "bg-brand-ink" : "bg-brand") : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* 場次清單 */}
      <div className="flex-1 px-4 py-2 space-y-3">
        {sessions === null && <p className="text-center text-muted text-sm py-10">{t("common_loading")}</p>}
        {sessions?.length === 0 && <p className="text-center text-muted text-sm py-10">{t("schedule_noClasses")}</p>}
        {sessions?.map((s) => {
          const state = sessionState(s, now);
          const dim = state !== "open" && !(state === "closed" && s.household_booked);
          const showMin = state === "open" && s.min_attendance > 1 && s.booked_count < s.min_attendance;
          return (
            <Link
              key={s.id}
              href={`/session/${s.id}`}
              className={`block bg-surface border border-border rounded-2xl p-4 shadow-card hover:-translate-y-0.5 hover:border-brand/40 active:translate-y-0 ${
                dim ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-stretch justify-between gap-3">
                {/* 左側時段色條：停課為灰 */}
                <div className="flex items-stretch gap-3 min-w-0">
                  <span className={`w-1 rounded-full shrink-0 ${state === "cancelled" ? "bg-gray-300" : "bg-brand/80"}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-muted tabular-nums">
                      {hhmm(s.start_time)} – {hhmm(s.end_time)}
                    </p>
                    <p className={`font-bold text-base mt-0.5 ${state === "cancelled" ? "line-through" : ""}`}>
                      {s.title}
                    </p>
                    <p className="text-sm text-muted mt-0.5">{s.coach_name ?? t("session_coach")}</p>
                    {showMin && (
                      <p className="text-[11px] text-muted mt-1">
                        {t("schedule_minNote", { min: s.min_attendance, n: s.booked_count })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge state={state} booked={!!s.household_booked} remaining={s.remaining} />
                  {state !== "cancelled" && (
                    <p className="text-[11px] text-muted mt-1 tabular-nums">
                      {t("schedule_peopleCount", { booked: s.booked_count, capacity: s.capacity })}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// 狀態徽章優先順序：停課 > 已預約 > 已截止 > 額滿 > 尚餘名額（剩 3 位內轉紅提醒）
function StatusBadge({ state, booked, remaining }: { state: SessionState; booked: boolean; remaining: number }) {
  const { t } = useLiff();
  const base = "inline-block text-xs font-medium px-2.5 py-1 rounded-full";
  if (state === "cancelled") return <span className={`${base} bg-gray-100 text-gray-500`}>{t("schedule_cancelled")}</span>;
  if (booked) return <span className={`${base} bg-brand text-brand-ink`}>✓ {t("schedule_booked")}</span>;
  if (state === "closed") return <span className={`${base} bg-gray-100 text-gray-500`}>{t("schedule_closed")}</span>;
  if (remaining <= 0) return <span className={`${base} bg-gray-100 text-gray-400`}>{t("schedule_full")}</span>;
  const low = remaining <= 3;
  return (
    <span className={`${base} ${low ? "bg-accent/10 text-accent" : "bg-brand/10 text-brand"}`}>
      {t("schedule_seatsLeft", { n: remaining })}
    </span>
  );
}
