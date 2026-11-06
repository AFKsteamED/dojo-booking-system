"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";
import { shortDateTW, hhmm } from "@/lib/date-utils";
import { sessionStartMs } from "@/lib/session-status";
import { useNow } from "@/lib/use-now";

const RELATION: Record<string, string> = {
  child: "子女",
  spouse: "配偶",
  parent: "父母",
  sibling: "兄弟姊妹",
  friend: "朋友",
  other: "其他",
};

type Row = {
  id: string;
  status: string;
  display_name: string;
  phone: string | null;
  line_display_name: string | null;
  relation: string | null;
  guardian_name: string | null;
};
type Info = {
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  min_attendance: number;
  status: string;
  cancel_reason: "manual" | "insufficient" | null;
  coach_name: string | null;
};

export default function AdminSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [info, setInfo] = useState<Info | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const now = useNow();

  const load = useCallback(() => {
    adminApi.session(id).then((d) => {
      setInfo(d.session);
      setRows(d.bookings);
    });
  }, [id]);
  useEffect(load, [load]);

  async function act(bookingId: string, action: "attended" | "no_show" | "cancel") {
    if (action === "cancel" && !confirm("強制取消並退還 1 堂？\n學員會收到 LINE 取消通知。")) return;
    await adminApi.updateBooking(bookingId, action);
    load();
  }

  if (!info) return <p className="text-gray-400 text-sm py-6 text-center">載入中…</p>;
  const isCancelled = info.status === "cancelled";
  const active = rows.filter((r) => r.status === "booked" || r.status === "attended" || r.status === "no_show");
  const cancelledRows = rows.filter((r) => r.status === "cancelled");
  const started = sessionStartMs(info) <= now;
  const attended = active.filter((r) => r.status === "attended").length;
  const noShow = active.filter((r) => r.status === "no_show").length;

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="text-sm text-gray-500">
        ‹ 返回
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className={`font-bold ${isCancelled ? "line-through text-gray-400" : ""}`}>{info.title}</p>
        <p className="text-sm text-gray-500 mt-1">
          {shortDateTW(info.session_date)} {hhmm(info.start_time)} – {hhmm(info.end_time)} · {info.coach_name ?? "教練"}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          有效預約 {active.length} / {info.capacity} 人
          {info.min_attendance > 1 && ` · 滿 ${info.min_attendance} 人開班`}
          {started && active.length > 0 && ` · 出席 ${attended} · 缺席 ${noShow}`}
        </p>
        {isCancelled && (
          <p className="mt-2 text-sm text-accent bg-accent/5 rounded-lg px-3 py-2">
            {info.cancel_reason === "insufficient"
              ? `已停課：開課前 3 小時預約人數未達 ${info.min_attendance} 人，系統已自動退堂並以 LINE 通知。`
              : "已停課：已預約的學員皆已退還堂數。"}
          </p>
        )}
      </div>

      {!isCancelled && (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {active.length === 0 && <p className="text-gray-400 text-sm py-8 text-center">目前沒有預約</p>}
          {active.map((r) => (
            <div key={r.id} className="p-3 flex items-center justify-between gap-3">
              <Person r={r} />
              <div className="flex gap-1.5 shrink-0">
                <MiniBtn onClick={() => act(r.id, "attended")} color="green" active={r.status === "attended"}>
                  報到
                </MiniBtn>
                <MiniBtn onClick={() => act(r.id, "no_show")} color="gray" active={r.status === "no_show"}>
                  未到
                </MiniBtn>
                <MiniBtn onClick={() => act(r.id, "cancel")} color="red">
                  取消
                </MiniBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelledRows.length > 0 && (
        <details className="bg-white border border-gray-200 rounded-xl" open={isCancelled}>
          <summary className="px-4 py-3 text-sm text-gray-500 cursor-pointer">
            已取消 / 已退堂（{cancelledRows.length}）
          </summary>
          <div className="divide-y divide-gray-100 border-t border-gray-100">
            {cancelledRows.map((r) => (
              <div key={r.id} className="p-3 opacity-70">
                <Person r={r} />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Person({ r }: { r: Row }) {
  return (
    <div className="min-w-0">
      <p className="font-medium flex items-center gap-1.5 flex-wrap">
        {r.display_name}
        {r.relation && (
          <span className="text-[11px] bg-brand/10 text-brand rounded-full px-1.5 py-0.5">
            {RELATION[r.relation] ?? r.relation}
          </span>
        )}
        <StatusTag status={r.status} />
      </p>
      <p className="text-xs text-gray-400 truncate">
        {[
          r.guardian_name && `由 ${r.guardian_name} 代訂`,
          r.line_display_name && `LINE：${r.line_display_name}`,
          r.phone,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  );
}

function StatusTag({ status }: { status: string }) {
  const m: Record<string, { t: string; c: string }> = {
    booked: { t: "預約中", c: "text-brand" },
    attended: { t: "已報到", c: "text-green-600" },
    no_show: { t: "未到", c: "text-red-500" },
    cancelled: { t: "已取消", c: "text-gray-400" },
  };
  const x = m[status] ?? m.booked;
  return <span className={`text-xs ${x.c}`}>{x.t}</span>;
}

function MiniBtn({
  children,
  onClick,
  color,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  color: "green" | "gray" | "red";
  active?: boolean;
}) {
  const cls = {
    green: active ? "bg-green-600 text-white border-green-600" : "text-green-600 border-green-200",
    gray: active ? "bg-gray-500 text-white border-gray-500" : "text-gray-500 border-gray-200",
    red: "text-red-500 border-red-200",
  }[color];
  return (
    <button onClick={onClick} className={`text-xs border rounded-lg px-2 py-1 ${cls}`}>
      {children}
    </button>
  );
}
