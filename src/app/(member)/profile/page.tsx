"use client";

import { useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { updateProfile } from "@/lib/client-api";

export default function ProfilePage() {
  const { profile, member, setMember } = useLiff();
  const phoneLocked = !!member?.phone?.trim();
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSave() {
    if (!phoneLocked && !phone.trim()) {
      setMsg("請填寫電話");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { member: updated, profileComplete } = await updateProfile({
        phone,
        email,
      });
      setMember(updated, profileComplete);
      setMsg("已儲存 ✓");
    } catch {
      setMsg("儲存失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold">個人檔案</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          {profile?.pictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.pictureUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand/20" />
          )}
          <div>
            <p className="font-bold">{member?.display_name || profile?.displayName}</p>
            <p className="text-xs text-muted">LINE 已連結</p>
          </div>
        </div>

        {/* 姓名：鎖定為 LINE 名稱，唯讀 */}
        <div>
          <span className="text-sm text-muted">姓名（來自 LINE）</span>
          <div className="mt-1 w-full rounded-xl border border-border bg-gray-50 px-4 py-3 text-gray-600">
            {member?.display_name || profile?.displayName}
          </div>
        </div>

        {/* 電話：首次可填，之後鎖定 */}
        <div>
          <span className="text-sm text-muted">電話 *</span>
          {phoneLocked ? (
            <div className="mt-1 w-full rounded-xl border border-border bg-gray-50 px-4 py-3 text-gray-600">
              {member?.phone}
            </div>
          ) : (
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xxxxxxxx"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-brand"
            />
          )}
          {phoneLocked && (
            <p className="text-[11px] text-muted mt-1">如需修改電話，請洽櫃檯或教練</p>
          )}
        </div>

        <label className="block">
          <span className="text-sm text-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="選填"
            className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-brand"
          />
        </label>

        {msg && (
          <p className="text-center text-sm text-brand bg-brand/10 rounded-lg py-2">{msg}</p>
        )}

        <button
          onClick={handleSave}
          disabled={busy}
          className="w-full rounded-2xl bg-brand text-brand-ink py-4 font-bold disabled:opacity-50"
        >
          {busy ? "儲存中…" : "儲存"}
        </button>
      </div>
    </div>
  );
}
