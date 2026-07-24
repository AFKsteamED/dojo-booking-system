"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";
import { shortDateTW, hhmm } from "@/lib/date-utils";

type Row = { id: string; status: string; display_name: string; phone: string | null };
type Info = {
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
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

  const load = useCallback(() => {
    adminApi.session(id).then((d) => {
      setInfo(d.session);
      setRows(d.bookings);
    });
  }, [id]);
  useEffect(load, [load]);

  async function act(bookingId: string, action: "attended" | "no_show" | "cancel") {
    if (action === "cancel" && !confirm("強制取消並退還 1 堂？")) return;
    await adminApi.updateBooking(bookingId, action);
    load();
  }

  if (!info) return <p className="text-gray-400 text-sm py-6 text-center">載入中…</p>;
  const active = rows.filter((r) => r.status === "booked" || r.status === "attended" || r.status === "no_show");

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="text-sm text-gray-500">‹ 返回課表</button>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="font-bold">{info.title}</p>
        <p className="text-sm text-gray-500 mt-1">
          {shortDateTW(info.session_date)} {hhmm(info.start_time)} – {hhmm(info.end_time)} ·{" "}
          {info.coach_name ?? "教練"}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          有效預約 {active.filter((r) => r.status !== "cancelled").length} / {info.capacity} 人
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {active.length === 0 && (
          <p className="text-gray-400 text-sm py-8 text-center">目前沒有預約</p>
        )}
        {active.map((r) => (
          <div key={r.id} className="p-3 flex items-center justify-between">
            <div>
              <p className="font-medium">
                {r.display_name} <StatusTag status={r.status} />
              </p>
              {r.phone && <p className="text-xs text-gray-400">{r.phone}</p>}
            </div>
            <div className="flex gap-1.5">
              <MiniBtn onClick={() => act(r.id, "attended")} color="green">報到</MiniBtn>
              <MiniBtn onClick={() => act(r.id, "no_show")} color="gray">未到</MiniBtn>
              <MiniBtn onClick={() => act(r.id, "cancel")} color="red">取消</MiniBtn>
            </div>
          </div>
        ))}
      </div>
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  color: "green" | "gray" | "red";
}) {
  const cls = {
    green: "text-green-600 border-green-200",
    gray: "text-gray-500 border-gray-200",
    red: "text-red-500 border-red-200",
  }[color];
  return (
    <button onClick={onClick} className={`text-xs border rounded-lg px-2 py-1 ${cls}`}>
      {children}
    </button>
  );
}
