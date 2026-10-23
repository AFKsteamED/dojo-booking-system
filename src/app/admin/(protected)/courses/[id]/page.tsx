"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";
import { hhmm } from "@/lib/date-utils";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
type Member = { id: string; display_name: string; phone: string | null };
type Coach = { id: string; name: string };
type Tpl = {
  id: string;
  title: string;
  coach_id: string | null;
  weekday: number;
  start_time: string;
  end_time: string;
  capacity: number;
  min_attendance: number;
  visibility: "public" | "private";
};

export default function ManageCourse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tpl, setTpl] = useState<Tpl | null>(null);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  // 編輯欄位
  const [title, setTitle] = useState("");
  const [coachId, setCoachId] = useState("");
  const [weekday, setWeekday] = useState(4);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState("");
  const [minAtt, setMinAtt] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi.template(id).then((d) => {
      const t: Tpl = d.template;
      setTpl(t);
      setMembers(d.members);
      setTitle(t.title);
      setCoachId(t.coach_id ?? "");
      setWeekday(t.weekday);
      setStartTime(hhmm(t.start_time));
      setEndTime(hhmm(t.end_time));
      setCapacity(String(t.capacity));
      setMinAtt(String(t.min_attendance ?? 1));
    });
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => {
    adminApi.coaches().then((d) => setCoaches(d.coaches)).catch(() => {});
  }, []);

  async function save() {
    const cap = Number(capacity);
    const min = Number(minAtt);
    if (!Number.isInteger(cap) || cap < 1) return setMsg({ ok: false, text: "人數上限需為 1 以上的整數" });
    if (!Number.isInteger(min) || min < 1 || min > cap) {
      return setMsg({ ok: false, text: "開班人數需介於 1 到人數上限之間" });
    }
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.updateTemplate(id, {
        title,
        coach_id: coachId || null,
        weekday,
        start_time: startTime,
        end_time: endTime,
        capacity: cap,
        min_attendance: min,
      });
      setMsg({ ok: true, text: "已儲存，未來場次同步更新 ✓" });
      load();
    } catch {
      setMsg({ ok: false, text: "儲存失敗" });
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    if (!confirm("停用整個常態課？未來場次會取消，已預約的學員自動退堂。")) return;
    await adminApi.deactivateTemplate(id);
    router.push("/admin/courses");
    router.refresh();
  }

  if (!tpl) return <p className="text-gray-400 text-sm py-6 text-center">載入中…</p>;

  return (
    <div className="space-y-5 max-w-lg">
      <button onClick={() => router.back()} className="text-sm text-gray-500">‹ 返回</button>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold">編輯常態課</h1>
        {tpl.visibility === "private" ? (
          <span className="text-[11px] bg-accent/10 text-accent rounded-full px-2 py-0.5">私人</span>
        ) : (
          <span className="text-[11px] bg-brand/10 text-brand rounded-full px-2 py-0.5">公開</span>
        )}
      </div>

      {/* 編輯欄位 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <Field label="課名">
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </Field>
        <Field label="教練">
          <select value={coachId} onChange={(e) => setCoachId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">（未指定）</option>
            {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="星期">
          <div className="flex gap-1.5">
            {WEEKDAYS.map((w, i) => (
              <button key={i} onClick={() => setWeekday(i)}
                className={`w-9 h-9 rounded-lg text-sm ${
                  weekday === i ? "bg-brand text-white" : "bg-white border border-gray-200 text-gray-600"
                }`}>{w}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="開始"><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="結束"><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="人數上限"><input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="開班人數"><input type="number" min={1} value={minAtt} onChange={(e) => setMinAtt(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></Field>
        </div>
        {msg && <p className={`text-sm ${msg.ok ? "text-brand" : "text-accent"}`}>{msg.text}</p>}
        <button onClick={save} disabled={busy}
          className="w-full bg-brand text-white rounded-lg py-2.5 font-medium hover:bg-brand-strong disabled:opacity-50">
          {busy ? "儲存中…" : "儲存變更"}
        </button>
        <p className="text-[11px] text-gray-400">
          變更會同步套用到未來場次；改星期會把未來「無人預約」的場次移到新星期。
          開課前 3 小時人數未達「開班人數」會自動停課並退堂（設為 1 即不會因人數不足停課）。
        </p>
      </div>

      {/* 參與名單（私人課） */}
      {tpl.visibility === "private" && (
        <MemberList id={id} members={members} reload={load} />
      )}

      {/* 停用 */}
      <button onClick={deactivate}
        className="w-full border border-accent/40 text-accent rounded-xl py-2.5 text-sm">
        停用整個常態課
      </button>
    </div>
  );
}

function MemberList({
  id, members, reload,
}: {
  id: string;
  members: Member[];
  reload: () => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Member[]>([]);

  useEffect(() => {
    if (!q.trim()) return setResults([]);
    const t = setTimeout(() => {
      adminApi.members(q).then((d) => setResults(d.members)).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function add(m: Member) { await adminApi.addTemplateMember(id, m.id); setQ(""); setResults([]); reload(); }
  async function remove(mid: string) { await adminApi.removeTemplateMember(id, mid); reload(); }

  return (
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
            <button onClick={() => remove(m.id)} className="text-xs text-accent border border-accent/30 rounded-lg px-2 py-1">移除</button>
          </div>
        ))}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋姓名或電話加入"
        className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
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
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
