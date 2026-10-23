"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";
import { shortDateTW, hhmm } from "@/lib/date-utils";

type PastSession = {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  visibility: "public" | "private";
  coach_name: string | null;
  participant_count: number;
  attended_count: number;
  no_show_count: number;
};

const PAGE = 20;

// 過去紀錄：已成功開班（未停課、有人預約）的課程，由新到舊；點進去看當堂名單與出席
export default function AdminPastSessionsPage() {
  const [list, setList] = useState<PastSession[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadedOffset, setLoadedOffset] = useState(-1);
  const loadingMore = loadedOffset !== offset;

  useEffect(() => {
    let cancelled = false;
    adminApi
      .past(offset, PAGE)
      .then((d) => {
        if (cancelled) return;
        setList((prev) => (offset === 0 ? d.sessions : [...(prev ?? []), ...d.sessions]));
        setHasMore(d.hasMore);
      })
      .catch(() => !cancelled && setList((prev) => prev ?? []))
      .finally(() => !cancelled && setLoadedOffset(offset));
    return () => {
      cancelled = true;
    };
  }, [offset]);

  // 依月份分組
  const groups = new Map<string, PastSession[]>();
  for (const s of list ?? []) {
    const [y, m] = s.session_date.split("-");
    const key = `${y} 年 ${Number(m)} 月`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">過去紀錄</h1>
        <p className="text-xs text-gray-400 mt-0.5">已成功開班的課程（不含停課）· 點課程可看當堂名單與出席狀況</p>
      </div>

      {list === null && <p className="text-gray-400 text-sm py-6 text-center">載入中…</p>}
      {list?.length === 0 && <p className="text-gray-400 text-sm py-6 text-center">尚無已開班的課程紀錄</p>}

      {[...groups.entries()].map(([month, items]) => (
        <section key={month} className="space-y-2">
          <h2 className="text-sm font-bold text-gray-500">{month}</h2>
          {items.map((s) => {
            const unmarked = s.participant_count - s.attended_count - s.no_show_count;
            return (
              <Link
                key={s.id}
                href={`/admin/sessions/${s.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-brand/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 tabular-nums">
                        {shortDateTW(s.session_date)} {hhmm(s.start_time)}
                      </span>
                      {s.visibility === "private" && (
                        <span className="text-[11px] bg-accent/10 text-accent rounded-full px-2 py-0.5">私人</span>
                      )}
                    </div>
                    <p className="font-bold mt-0.5 truncate">{s.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{s.coach_name ?? "教練"}</p>
                  </div>
                  <div className="text-right shrink-0 text-xs space-y-1">
                    <p className="text-sm font-bold">{s.participant_count} 人</p>
                    <p className="text-gray-500">
                      出席 <span className="text-green-600 font-medium">{s.attended_count}</span> · 缺席{" "}
                      <span className="text-red-500 font-medium">{s.no_show_count}</span>
                    </p>
                    {unmarked > 0 && <p className="text-amber-600">{unmarked} 人未點名</p>}
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      ))}

      {hasMore && (
        <button
          onClick={() => setOffset((o) => o + PAGE)}
          disabled={loadingMore}
          className="w-full text-sm text-gray-500 border border-gray-200 rounded-lg py-2 bg-white disabled:opacity-50"
        >
          {loadingMore ? "載入中…" : "載入更早的紀錄"}
        </button>
      )}
    </div>
  );
}
