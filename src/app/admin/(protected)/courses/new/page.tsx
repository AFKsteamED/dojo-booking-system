"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";
import { toDateStr } from "@/lib/date-utils";

type Coach = { id: string; name: string };
type PickedMember = { id: string; display_name: string; phone: string | null };

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function NewCoursePage() {
  const router = useRouter();
  const [coaches, setCoaches] = useState<Coach[]>([]);

  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [recurrence, setRecurrence] = useState<"once" | "weekly">("weekly");
  const [title, setTitle] = useState("");
  const [coachId, setCoachId] = useState("");
  const [weekday, setWeekday] = useState(4); // 預設週四
  const [sessionDate, setSessionDate] = useState(toDateStr(new Date()));
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("20:30");
  const [capacity, setCapacity] = useState("6");
  const [members, setMembers] = useState<PickedMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    adminApi.coaches().then((d) => setCoaches(d.coaches)).catch(() => {});
  }, []);

  async function submit() {
    if (!title.trim()) return setMsg("請填課名");
    if (visibility === "private" && members.length === 0) {
      return setMsg("私人課請至少加入一位參與會員");
    }
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.createCourse({
        visibility,
        recurrence,
        title: title.trim(),
        coach_id: coachId || null,
        capacity: Number(capacity),
        start_time: startTime,
        end_time: endTime,
        weekday: recurrence === "weekly" ? weekday : undefined,
        session_date: recurrence === "once" ? sessionDate : undefined,
        member_ids: members.map((m) => m.id),
      });
      router.push("/admin/schedule");
      router.refresh();
    } catch {
      setMsg("建立失敗，請檢查欄位");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-lg">
      <button onClick={() => router.back()} className="text-sm text-gray-500">‹ 返回</button>
      <h1 className="text-lg font-bold">新增課程</h1>

      <Segment
        label="類型"
        value={visibility}
        onChange={(v) => setVisibility(v as "public" | "private")}
        options={[
          { v: "public", t: "公開（所有人可見）" },
          { v: "private", t: "私人（限名單）" },
        ]}
      />
      <Segment
        label="週期"
        value={recurrence}
        onChange={(v) => setRecurrence(v as "once" | "weekly")}
        options={[
          { v: "weekly", t: "每週重複" },
          { v: "once", t: "單堂" },
        ]}
      />

      <Field label="課名">
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="例：週四清大班 / 拳擊一對一"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </Field>

      <Field label="教練">
        <select value={coachId} onChange={(e) => setCoachId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">（未指定）</option>
          {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>

      {recurrence === "weekly" ? (
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
      ) : (
        <Field label="日期">
          <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </Field>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Field label="開始"><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></Field>
        <Field label="結束"><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></Field>
        <Field label="人數上限"><input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></Field>
      </div>

      {visibility === "private" && (
        <Field label="參與名單（只有這些會員看得到並能預約）">
          <MemberPicker members={members} setMembers={setMembers} />
        </Field>
      )}

      {msg && <p className="text-sm text-accent">{msg}</p>}

      <button onClick={submit} disabled={busy}
        className="w-full bg-brand text-white rounded-lg py-3 font-bold hover:bg-brand-strong disabled:opacity-50">
        {busy ? "建立中…" : "建立課程"}
      </button>
    </div>
  );
}

function MemberPicker({
  members, setMembers,
}: {
  members: PickedMember[];
  setMembers: (m: PickedMember[]) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickedMember[]>([]);

  useEffect(() => {
    if (!q.trim()) return setResults([]);
    const t = setTimeout(() => {
      adminApi.members(q).then((d) => setResults(d.members)).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function add(m: PickedMember) {
    if (!members.find((x) => x.id === m.id)) setMembers([...members, m]);
    setQ("");
    setResults([]);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <span key={m.id} className="text-xs bg-brand/10 text-brand rounded-full pl-3 pr-1 py-1 flex items-center gap-1">
            {m.display_name || "會員"}
            <button onClick={() => setMembers(members.filter((x) => x.id !== m.id))}
              className="w-4 h-4 rounded-full bg-brand/20 text-brand text-[10px]">×</button>
          </span>
        ))}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋姓名或電話加入"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      {results.length > 0 && (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
          {results.map((m) => (
            <button key={m.id} onClick={() => add(m)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
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

function Segment({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; t: string }[];
}) {
  return (
    <div>
      <span className="text-xs text-gray-500">{label}</span>
      <div className="mt-1 flex gap-2">
        {options.map((o) => (
          <button key={o.v} onClick={() => onChange(o.v)}
            className={`flex-1 rounded-lg py-2 text-sm ${
              value === o.v ? "bg-brand text-white" : "bg-white border border-gray-200 text-gray-600"
            }`}>{o.t}</button>
        ))}
      </div>
    </div>
  );
}
