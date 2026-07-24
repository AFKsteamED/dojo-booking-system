"use client";

import { useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { updateProfile } from "@/lib/client-api";

export default function ProfilePage() {
  const { profile, member, profileComplete, setMember } = useLiff();
  const [displayName, setDisplayName] = useState(member?.display_name ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSave() {
    if (!profile) return;
    if (!displayName.trim() || !phone.trim()) {
      setMsg("姓名與電話為必填");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { member: updated, profileComplete } = await updateProfile({
        lineUserId: profile.userId,
        display_name: displayName,
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
            <p className="font-bold">{profile?.displayName}</p>
            <p className="text-xs text-muted">LINE 已連結</p>
          </div>
        </div>

        {!profileComplete && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
            首次使用請先填寫姓名與電話，才能預約課程。
          </p>
        )}

        <Field label="姓名 *" value={displayName} onChange={setDisplayName} placeholder="你的姓名" />
        <Field label="電話 *" value={phone} onChange={setPhone} placeholder="09xxxxxxxx" type="tel" />
        <Field label="Email" value={email} onChange={setEmail} placeholder="選填" type="email" />

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

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-brand"
      />
    </label>
  );
}
