"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";

const RELATION: Record<string, string> = {
  child: "子女",
  spouse: "配偶",
  parent: "父母",
  sibling: "兄弟姊妹",
  friend: "朋友",
  other: "其他",
};

type M = {
  id: string;
  display_name: string;
  line_display_name: string | null;
  phone: string | null;
  guardian_id: string | null;
  relation: string | null;
  registered_at: string | null;
};

export default function AdminMembersPage() {
  const [q, setQ] = useState("");
  const [list, setList] = useState<M[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      adminApi
        .members(q)
        .then((d) => !cancelled && setList(d.members))
        .catch(() => !cancelled && setList([]));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">會員 / 堂數</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜尋真實姓名、LINE 暱稱或電話"
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm"
      />

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {list === null && <p className="text-gray-400 text-sm py-8 text-center">載入中…</p>}
        {list?.length === 0 && (
          <p className="text-gray-400 text-sm py-8 text-center">沒有符合的會員</p>
        )}
        {list?.map((m) => {
          const unregistered = !m.guardian_id && !m.registered_at;
          return (
            <Link
              key={m.id}
              href={`/admin/members/${m.id}`}
              className="p-3 flex items-center justify-between hover:bg-gray-50"
            >
              <div>
                <p className="font-medium flex items-center gap-2">
                  {unregistered ? m.line_display_name || "（未填姓名）" : m.display_name}
                  {unregistered && (
                    <span className="text-[11px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">未註冊</span>
                  )}
                  {m.guardian_id && (
                    <span className="text-[11px] bg-accent/10 text-accent rounded-full px-2 py-0.5">
                      代訂{m.relation ? `・${RELATION[m.relation] ?? m.relation}` : ""}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {!unregistered && m.line_display_name ? `LINE：${m.line_display_name} · ` : ""}
                  {m.phone ?? "未填電話"}
                </p>
              </div>
              <span className="text-gray-300">›</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
