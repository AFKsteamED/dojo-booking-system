"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";
import { hhmm } from "@/lib/date-utils";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
type Member = { id: string; display_name: string; phone: string | null };

export default function ManageCourseMembers({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [tpl, setTpl] = useState<{ title: string; weekday: number; start_time: string; end_time: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Member[]>([]);

  const load = useCallback(() => {
    adminApi.template(id).then((d) => {
      setTpl(d.template);
      setMembers(d.members);
    });
  }, [id]);
  useEffect(load, [load]);

  useEffect(() => {
    if (!q.trim()) return setResults([]);
    const t = setTimeout(() => {
      adminApi.members(q).then((d) => setResults(d.members)).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function add(m: Member) {
    await adminApi.addTemplateMember(id, m.id);
    setQ("");
    setResults([]);
    load();
  }
  async function remove(memberId: string) {
    await adminApi.removeTemplateMember(id, memberId);
    load();
  }

  if (!tpl) return <p className="text-gray-400 text-sm py-6 text-center">載入中…</p>;

  return (
    <div className="space-y-4 max-w-lg">
      <button onClick={() => router.back()} className="text-sm text-gray-500">‹ 返回</button>
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="font-bold">{tpl.title}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          每週{WEEKDAYS[tpl.weekday]} {hhmm(tpl.start_time)}–{hhmm(tpl.end_time)}
        </p>
      </div>

      <div>
        <p className="font-bold mb-2">參與名單（{members.length} 人）</p>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {members.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">尚無成員</p>}
          {members.map((m) => (
            <div key={m.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{m.display_name || "（未填姓名）"}</p>
                <p className="text-xs text-gray-400">{m.phone ?? ""}</p>
              </div>
              <button onClick={() => remove(m.id)} className="text-xs text-accent border border-accent/30 rounded-lg px-2 py-1">
                移除
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-1">加入成員</p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋姓名或電話"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        {results.length > 0 && (
          <div className="mt-1 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
            {results.map((m) => (
              <button key={m.id} onClick={() => add(m)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                {m.display_name || "（未填姓名）"} <span className="text-gray-400">{m.phone ?? ""}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
