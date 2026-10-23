"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";
import { shortDateTW, hhmm, addDaysStr } from "@/lib/date-utils";
import { sessionState, sessionStartMs } from "@/lib/session-status";
import { useNow } from "@/lib/use-now";

type AdminSession = {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: string;
  visibility: "public" | "private";
  min_attendance: number;
  cancel_reason: "manual" | "insufficient" | null;
  coach_name: string | null;
  booked_count: number;
};

// 近期課程：依日期分組，每堂課直接標出開班狀態（還差幾人／已達開班／停課）
export default function AdminSchedulePage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<{ sessions: AdminSession[]; today: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .upcoming(days)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData({ sessions: [], today: "" }));
    return () => {
      cancelled = true;
    };
  }, [days, reloadKey]);

  async function cancelSession(s: AdminSession) {
    const msg =
      s.booked_count > 0
        ? `確定將「${s.title}」停課？\n已預約的 ${s.booked_count} 位學員將自動退還堂數。`
        : `確定將「${s.title}」停課？`;
    if (!confirm(msg)) return;
    await adminApi.cancelSession(s.id);
    setReloadKey((k) => k + 1);
  }

  const now = useNow();
  const groups = new Map<string, AdminSession[]>();
  for (const s of data?.sessions ?? []) {
    const list = groups.get(s.session_date) ?? [];
    list.push(s);
    groups.set(s.session_date, list);
  }

  const dayLabel = (d: string) => {
    if (!data?.today) return shortDateTW(d);
    if (d === data.today) return `今天 · ${shortDateTW(d)}`;
    if (d === addDaysStr(data.today, 1)) return `明天 · ${shortDateTW(d)}`;
    return shortDateTW(d);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">近期課程</h1>
          <p className="text-xs text-gray-400 mt-0.5">今天起 {days} 天 · 點課程可看預約名單與點名</p>
        </div>
        <Link
          href="/admin/courses/new"
          className="shrink-0 text-sm bg-brand text-white rounded-lg px-3 py-2 hover:bg-brand-strong"
        >
          ＋ 新增課程
        </Link>
      </div>

      {data === null && <p className="text-gray-400 text-sm py-6 text-center">載入中…</p>}
      {data && groups.size === 0 && <p className="text-gray-400 text-sm py-6 text-center">這段期間沒有課程</p>}

      {[...groups.entries()].map(([date, list]) => (
        <section key={date} className="space-y-2">
          <h2 className="text-sm font-bold text-gray-500">{dayLabel(date)}</h2>
          {list.map((s) => (
            <SessionCard key={s.id} s={s} now={now} onCancel={() => cancelSession(s)} />
          ))}
        </section>
      ))}

      {data && (
        <button
          onClick={() => setDays((n) => n + 7)}
          className="w-full text-sm text-gray-500 border border-gray-200 rounded-lg py-2 bg-white"
        >
          再顯示 7 天
        </button>
      )}
    </div>
  );
}

function SessionCard({ s, now, onCancel }: { s: AdminSession; now: number; onCancel: () => void }) {
  const state = sessionState(s, now);
  const started = sessionStartMs(s) <= now;
  const isCancelled = s.status === "cancelled";
  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3 ${
        isCancelled ? "opacity-60" : ""
      }`}
    >
      <Link href={`/admin/sessions/${s.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 tabular-nums">
            {hhmm(s.start_time)} – {hhmm(s.end_time)}
          </span>
          <VisBadge v={s.visibility} />
          <StateBadge s={s} state={state} started={started} />
        </div>
        <p className={`font-bold mt-0.5 ${isCancelled ? "line-through" : ""}`}>{s.title}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {s.coach_name ?? "教練"} · 預約 {s.booked_count}/{s.capacity} 人
          {s.min_attendance > 1 && ` · 滿 ${s.min_attendance} 人開班`}
        </p>
      </Link>
      <div className="flex flex-col gap-2 items-end shrink-0">
        <Link
          href={`/admin/sessions/${s.id}`}
          className="text-sm text-brand border border-brand/30 rounded-lg px-3 py-1.5"
        >
          名單
        </Link>
        {!isCancelled && !started && (
          <button onClick={onCancel} className="text-xs text-accent">
            停課
          </button>
        )}
      </div>
    </div>
  );
}

function StateBadge({
  s,
  state,
  started,
}: {
  s: AdminSession;
  state: ReturnType<typeof sessionState>;
  started: boolean;
}) {
  const base = "text-[11px] rounded-full px-2 py-0.5";
  if (s.status === "cancelled") {
    const reason = s.cancel_reason === "insufficient" ? "（人數不足）" : s.cancel_reason === "manual" ? "（手動）" : "";
    return <span className={`${base} bg-gray-100 text-gray-500`}>停課{reason}</span>;
  }
  if (state === "cancelled") {
    return <span className={`${base} bg-accent/10 text-accent`}>人數不足，即將自動停課</span>;
  }
  if (started) return <span className={`${base} bg-gray-100 text-gray-500`}>已開課</span>;
  if (state === "closed") return <span className={`${base} bg-green-100 text-green-700`}>確定開班 · 已截止</span>;
  if (s.min_attendance <= 1) return null;
  const short = s.min_attendance - s.booked_count;
  return short > 0 ? (
    <span className={`${base} bg-amber-100 text-amber-700`}>還差 {short} 人開班</span>
  ) : (
    <span className={`${base} bg-green-100 text-green-700`}>已達開班人數</span>
  );
}

function VisBadge({ v }: { v: "public" | "private" }) {
  return v === "private" ? (
    <span className="text-[11px] bg-accent/10 text-accent rounded-full px-2 py-0.5">私人</span>
  ) : (
    <span className="text-[11px] bg-brand/10 text-brand rounded-full px-2 py-0.5">公開</span>
  );
}
