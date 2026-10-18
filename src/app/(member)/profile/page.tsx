"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiff } from "@/components/liff-provider";
import { GenderSelect } from "@/components/gender-select";
import { updateProfile } from "@/lib/client-api";
import { todayInTaipei } from "@/lib/date-utils";

export default function ProfilePage() {
  const { profile, member, setMember, t } = useLiff();
  const [form, setForm] = useState({
    gender: member?.gender ?? "",
    birthday: member?.birthday ?? "",
    emergency_contact_name: member?.emergency_contact_name ?? "",
    emergency_contact_phone: member?.emergency_contact_phone ?? "",
    email: member?.email ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.gender || !form.birthday || !form.emergency_contact_name.trim() || !form.emergency_contact_phone.trim()) {
      setMsg(t("register_required"));
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { member: updated, profileComplete } = await updateProfile(form);
      setMember(updated, profileComplete);
      setMsg(t("profile_saved"));
    } catch {
      setMsg(t("profile_saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold">{t("profile_title")}</h1>
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
            <p className="font-bold">{member?.display_name}</p>
            {member?.line_display_name && (
              <p className="text-xs text-muted">
                {t("profile_lineNickname", { name: member.line_display_name })}
              </p>
            )}
          </div>
        </div>

        {/* 鎖定欄位：真實姓名、電話（只有後台能改） */}
        <div className="grid grid-cols-2 gap-3">
          <Locked label={t("profile_realName")} value={member?.display_name ?? ""} />
          <Locked label={t("profile_phoneLabel")} value={member?.phone ?? ""} />
        </div>
        <p className="text-[11px] text-muted -mt-2">{t("profile_lockedNote")}</p>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("profile_genderLabel")}>
            <GenderSelect value={form.gender} onChange={set("gender")} />
          </Field>
          <Field label={t("profile_birthdayLabel")}>
            <Input type="date" value={form.birthday} onChange={set("birthday")} max={todayInTaipei()} />
          </Field>
          <Field label={t("profile_ecName")}>
            <Input value={form.emergency_contact_name} onChange={set("emergency_contact_name")} />
          </Field>
          <Field label={t("profile_ecPhone")}>
            <Input type="tel" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} />
          </Field>
        </div>

        <Field label={t("profile_emailLabel")}>
          <Input type="email" value={form.email} onChange={set("email")} placeholder={t("profile_emailPlaceholder")} />
        </Field>

        {msg && (
          <p className="text-center text-sm text-brand bg-brand/10 rounded-lg py-2">{msg}</p>
        )}

        <button
          onClick={handleSave}
          disabled={busy}
          className="w-full rounded-2xl bg-brand text-brand-ink py-4 font-bold shadow-card hover:bg-brand-strong disabled:opacity-50 disabled:hover:bg-brand"
        >
          {busy ? t("common_saving") : t("common_save")}
        </button>

        <Link
          href="/family"
          className="block text-center text-sm text-brand border border-brand/30 rounded-2xl py-3"
        >
          {t("profile_familyLink")} →
        </Link>
      </div>
    </div>
  );
}

function Locked({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-sm text-muted">{label}</span>
      <div className="mt-1 w-full rounded-xl border border-border bg-gray-50 px-4 py-3 text-gray-600 truncate">
        {value || "—"}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-sm text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  max?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-brand"
    />
  );
}
