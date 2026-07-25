"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";
import { toDateStr, addDays, shortDateTW, hhmm } from "@/lib/date-utils";
import type { Member, CreditWallet } from "@/lib/types";

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

  // 加堂表單
  const [walletType, setWalletType] = useState<"group" | "private">("group");
  const [credits, setCredits] = useState("10");
  const [validFrom, setValidFrom] = useState(toDateStr(new Date()));
  const [validTo, setValidTo] = useState(toDateStr(addDays(new Date(), 180)));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 後台改電話
  const [phoneEdit, setPhoneEdit] = useState("");
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi.member(id).then((d) => {
      setMember(d.member);
      setWallets(d.wallets);
      setBookings(d.bookings);
      setPhoneEdit(d.member.phone ?? "");
    });
  }, [id]);
  useEffect(load, [load]);

  async function savePhone() {
    setPhoneMsg(null);
    try {
      await adminApi.updateMember(id, { phone: phoneEdit });
      setPhoneMsg("已更新電話 ✓");
      load();
    } catch {
      setPhoneMsg("更新失敗");
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
        <p className="font-bold text-lg">{member.display_name || "（未填姓名）"}</p>
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="text-xs text-gray-500">電話（只有後台能改）</span>
            <input
              value={phoneEdit}
              onChange={(e) => setPhoneEdit(e.target.value)}
              placeholder="未填電話"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <button
            onClick={savePhone}
            className="text-sm bg-gray-800 text-white rounded-lg px-3 py-2"
          >
            儲存電話
          </button>
        </div>
        {phoneMsg && <p className="text-xs text-brand">{phoneMsg}</p>}
        {member.email && <p className="text-sm text-gray-500">Email：{member.email}</p>}
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
              <span className="text-gray-400">{b.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
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
