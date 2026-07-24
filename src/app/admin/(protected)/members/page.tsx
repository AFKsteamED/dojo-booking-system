"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";

type M = { id: string; display_name: string; phone: string | null; email: string | null };

export default function AdminMembersPage() {
  const [q, setQ] = useState("");
  const [list, setList] = useState<M[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      adminApi.members(q).then((d) => setList(d.members)).catch(() => setList([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">會員 / 堂數</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜尋姓名或電話"
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm"
      />

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {list === null && <p className="text-gray-400 text-sm py-8 text-center">載入中…</p>}
        {list?.length === 0 && (
          <p className="text-gray-400 text-sm py-8 text-center">沒有符合的會員</p>
        )}
        {list?.map((m) => (
          <Link
            key={m.id}
            href={`/admin/members/${m.id}`}
            className="p-3 flex items-center justify-between hover:bg-gray-50"
          >
            <div>
              <p className="font-medium">{m.display_name || "（未填姓名）"}</p>
              <p className="text-xs text-gray-400">{m.phone ?? "未填電話"}</p>
            </div>
            <span className="text-gray-300">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
