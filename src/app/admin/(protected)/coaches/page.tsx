"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/admin-api";

type Coach = { id: string; name: string; active: boolean };

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[] | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi.coachesAll().then((d) => setCoaches(d.coaches)).catch(() => setCoaches([]));
  }, []);
  useEffect(load, [load]);

  async function add() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await adminApi.createCoach(newName.trim());
      setNewName("");
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-lg font-bold">教練管理</h1>

      {/* 新增 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="font-bold mb-2">新增教練</p>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="教練姓名"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={add}
            disabled={busy}
            className="bg-brand text-white rounded-lg px-4 text-sm hover:bg-brand-strong disabled:opacity-50"
          >
            新增
          </button>
        </div>
      </div>

      {/* 清單 */}
      <div className="space-y-2">
        {coaches === null && <p className="text-gray-400 text-sm py-6 text-center">載入中…</p>}
        {coaches?.length === 0 && (
          <p className="text-gray-400 text-sm py-6 text-center">尚無教練</p>
        )}
        {coaches?.map((c) => (
          <CoachRow key={c.id} coach={c} reload={load} />
        ))}
      </div>
    </div>
  );
}

function CoachRow({ coach, reload }: { coach: Coach; reload: () => void }) {
  const [name, setName] = useState(coach.name);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = name.trim() !== coach.name;

  async function rename() {
    await adminApi.updateCoach(coach.id, { name });
    setMsg("已更新");
    reload();
  }
  async function toggle() {
    await adminApi.updateCoach(coach.id, { active: !coach.active });
    reload();
  }

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-2 ${
        coach.active ? "" : "opacity-60"
      }`}
    >
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setMsg(null);
        }}
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />
      {dirty && (
        <button onClick={rename} className="text-sm text-brand border border-brand/30 rounded-lg px-3 py-2">
          儲存
        </button>
      )}
      {msg && <span className="text-xs text-brand">{msg}</span>}
      <button
        onClick={toggle}
        className={`text-xs rounded-lg px-3 py-2 border ${
          coach.active ? "text-accent border-accent/30" : "text-brand border-brand/30"
        }`}
      >
        {coach.active ? "停用" : "啟用"}
      </button>
    </div>
  );
}
