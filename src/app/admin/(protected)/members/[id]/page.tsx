"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";
import { todayInTaipei, addDaysStr, shortDateTW, hhmm } from "@/lib/date-utils";
import type { Member, CreditWallet } from "@/lib/types";

const RELATION: Record<string, string> = {
  child: "子女",
  spouse: "配偶",
  parent: "父母",
  sibling: "兄弟姊妹",
  friend: "朋友",
  other: "其他",
};
const CONTACT: Record<string, string> = {
  father: "父親",
  mother: "母親",
  spouse: "配偶",
  child: "子女",
  sibling: "兄弟姊妹",
  friend: "朋友",
  other: "其他",
};
const BOOKING_STATUS: Record<string, string> = {
  booked: "預約中",
  attended: "已出席",
  no_show: "未出席",
  cancelled: "已取消",
};

type BookingRow = {
  id: string;
  status: string;
  session: { title: string; session_date: string; start_time: string } | null;
};

export default function AdminMemberDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [wallets, setWallets] = useState<CreditWallet[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [guardian, setGuardian] = useState<{ id: string; display_name: string } | null>(null);
  const [kids, setKids] = useState<
    { id: string; display_name: string; phone: string | null; relation: string | null }[]
  >([]);

  // 加堂表單
  const [walletType, setWalletType] = useState<"group" | "private">("group");
  const [credits, setCredits] = useState("10");
  const [validFrom, setValidFrom] = useState(() => todayInTaipei());
  const [validTo, setValidTo] = useState(() => addDaysStr(todayInTaipei(), 180));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 後台編輯基本資料（姓名、電話等學員端鎖定的欄位只有這裡能改）
  const [form, setForm] = useState({
    display_name: "",
    phone: "",
    email: "",
    gender: "",
    birthday: "",
    emergency_contact_name: "",
    emergency_contact_relation: "",
    emergency_contact_phone: "",
    relation: "",
    locale: "zh",
  });
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi.member(id).then((d) => {
      const m: Member = d.member;
      setMember(m);
      setWallets(d.wallets);
      setBookings(d.bookings);
      setGuardian(d.guardian ?? null);
      setKids(d.dependents ?? []);
      setForm({
        display_name: m.display_name ?? "",
        phone: m.phone ?? "",
        email: m.email ?? "",
        gender: m.gender ?? "",
        birthday: m.birthday ?? "",
        emergency_contact_name: m.emergency_contact_name ?? "",
        emergency_contact_relation: m.emergency_contact_relation ?? "",
        emergency_contact_phone: m.emergency_contact_phone ?? "",
        relation: m.relation ?? "",
        locale: m.locale ?? "zh",
      });
    });
  }, [id]);
  useEffect(load, [load]);

  async function saveProfile() {
    setProfileMsg(null);
    try {
      const { relation, locale, ...rest } = form;
      await adminApi.updateMember(id, {
        ...rest,
        gender: form.gender || null,
        birthday: form.birthday || null,
        emergency_contact_relation: form.emergency_contact_relation || null,
        // 代訂成員才有「關係」；有 LINE 的帳號才需要通知語言
        ...(member?.guardian_id ? { relation: relation || null } : {}),
        ...(member?.line_user_id ? { locale } : {}),
      });
      setProfileMsg("已更新 ✓");
      load();
    } catch {
      setProfileMsg("更新失敗，請檢查欄位");
    }
  }

  async function addCredits() {
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.addCredits(id, {
        type: walletType,
        credits: Number(credits),
        valid_from: validFrom,
        valid_to: validTo,
        note,
      });
      setMsg("已加堂數 ✓");
      setNote("");
      load();
    } catch {
      setMsg("加堂失敗，請檢查欄位");
    } finally {
      setBusy(false);
    }
  }

  if (!member) return <p className="text-gray-400 text-sm py-6 text-center">載入中…</p>;

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()} className="text-sm text-gray-500">‹ 返回會員</button>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-lg">
            {member.display_name || member.line_display_name || "（未填姓名）"}
          </p>
          {member.guardian_id && (
            <span className="text-[11px] bg-accent/10 text-accent rounded-full px-2 py-0.5">
              代訂成員{member.relation ? `（${RELATION[member.relation] ?? member.relation}）` : ""}
            </span>
          )}
          {member.line_user_id && !member.registered_at && (
            <span className="text-[11px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
              未註冊
            </span>
          )}
        </div>
        {member.line_display_name && (
          <p className="text-sm text-gray-500">LINE 暱稱：{member.line_display_name}</p>
        )}
        {guardian && (
          <p className="text-sm text-gray-500">
            帳號持有人（代為預約）：
            <Link href={`/admin/members/${guardian.id}`} className="text-brand underline">
              {guardian.display_name}
            </Link>
          </p>
        )}
        {kids.length > 0 && (
          <div className="text-sm text-gray-500">
            <span>代訂成員：</span>
            {kids.map((k, i) => (
              <span key={k.id}>
                {i > 0 && "、"}
                <Link href={`/admin/members/${k.id}`} className="text-brand underline">
                  {k.display_name}
                </Link>
                {k.relation && <span className="text-gray-400">（{RELATION[k.relation] ?? k.relation}）</span>}
              </span>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Field label="真實姓名（學員端鎖定）" value={form.display_name}
            onChange={(v) => setForm({ ...form, display_name: v })} />
          <Field label="電話（學員端鎖定）" value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })} />
          <label className="block">
            <span className="text-xs text-gray-500">性別</span>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">（未填）</option>
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="undisclosed">不公開</option>
            </select>
          </label>
          <Field label="生日" type="date" value={form.birthday}
            onChange={(v) => setForm({ ...form, birthday: v })} />
          <Field label="緊急聯絡人" value={form.emergency_contact_name}
            onChange={(v) => setForm({ ...form, emergency_contact_name: v })} />
          <Select label="緊急聯絡人關係" value={form.emergency_contact_relation}
            onChange={(v) => setForm({ ...form, emergency_contact_relation: v })} options={CONTACT} />
          <Field label="緊急聯絡電話" value={form.emergency_contact_phone}
            onChange={(v) => setForm({ ...form, emergency_contact_phone: v })} />
          <Field label="Email" value={form.email}
            onChange={(v) => setForm({ ...form, email: v })} />
          {member.guardian_id && (
            <Select label="與帳號持有人的關係" value={form.relation}
              onChange={(v) => setForm({ ...form, relation: v })} options={RELATION} />
          )}
          {member.line_user_id && (
            <Select label="介面與 LINE 通知語言" value={form.locale}
              onChange={(v) => setForm({ ...form, locale: v })} options={{ zh: "中文", en: "English" }}
              allowEmpty={false} />
          )}
        </div>
        {profileMsg && <p className="text-xs text-brand">{profileMsg}</p>}
        <button
          onClick={saveProfile}
          className="w-full text-sm bg-gray-800 text-white rounded-lg py-2"
        >
          儲存基本資料
        </button>
      </div>

      {/* 加堂數 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="font-bold">手動加堂數</p>
        <div>
          <span className="text-xs text-gray-500">類型</span>
          <div className="mt-1 flex gap-2">
            <button
              onClick={() => setWalletType("group")}
              className={`flex-1 rounded-lg py-2 text-sm ${
                walletType === "group" ? "bg-brand text-white" : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              團體堂數
            </button>
            <button
              onClick={() => setWalletType("private")}
              className={`flex-1 rounded-lg py-2 text-sm ${
                walletType === "private" ? "bg-accent text-white" : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              私人堂數
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="堂數" value={credits} onChange={setCredits} type="number" />
          <Field label="備註" value={note} onChange={setNote} placeholder="例：現金購買" />
          <Field label="有效起" value={validFrom} onChange={setValidFrom} type="date" />
          <Field label="有效迄" value={validTo} onChange={setValidTo} type="date" />
        </div>
        {msg && <p className="text-sm text-brand">{msg}</p>}
        <button
          onClick={addCredits}
          disabled={busy}
          className="w-full bg-brand text-white rounded-lg py-2.5 font-medium disabled:opacity-50"
        >
          {busy ? "處理中…" : "加入堂數"}
        </button>
      </div>

      {/* 現有錢包 */}
      <div>
        <p className="font-bold mb-2">堂數錢包</p>
        <div className="space-y-2">
          {wallets.length === 0 && <p className="text-sm text-gray-400">尚無堂數</p>}
          {wallets.map((w) => (
            <div key={w.id} className="bg-white border border-gray-200 rounded-xl p-3 text-sm">
              <div className="flex justify-between">
                <span>{w.type === "group" ? "團體" : "私人"}課程</span>
                <span className="font-bold text-brand">
                  剩 {w.remaining_credits} / {w.total_credits} 堂
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {w.valid_from} ~ {w.valid_to}
                {w.note ? ` · ${w.note}` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 預約紀錄 */}
      <div>
        <p className="font-bold mb-2">預約紀錄</p>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {bookings.length === 0 && (
            <p className="text-sm text-gray-400 py-6 text-center">尚無預約</p>
          )}
          {bookings.map((b) => (
            <div key={b.id} className="p-3 text-sm flex justify-between">
              <span>
                {b.session
                  ? `${shortDateTW(b.session.session_date)} ${hhmm(b.session.start_time)} ${b.session.title}`
                  : "—"}
              </span>
              <span className="text-gray-400 shrink-0">{BOOKING_STATUS[b.status] ?? b.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  allowEmpty = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Record<string, string>;
  allowEmpty?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
      >
        {allowEmpty && <option value="">（未填）</option>}
        {Object.entries(options).map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />
    </label>
  );
}
