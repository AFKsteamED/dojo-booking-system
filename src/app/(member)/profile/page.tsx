"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiff } from "@/components/liff-provider";
import { Field, TextInput, GenderSelect, ContactRelationSelect } from "@/components/form";
import { updateProfile } from "@/lib/client-api";
import { todayInTaipei } from "@/lib/date-utils";

const REQUIRED = [
  "gender",
  "birthday",
  "emergency_contact_name",
  "emergency_contact_relation",
  "emergency_contact_phone",
] as const;

export default function ProfilePage() {
  const { profile, member, setMember, t } = useLiff();
  const [form, setForm] = useState({
    gender: member?.gender ?? "",
    birthday: member?.birthday ?? "",
    emergency_contact_name: member?.emergency_contact_name ?? "",
    emergency_contact_relation: member?.emergency_contact_relation ?? "",
    emergency_contact_phone: member?.emergency_contact_phone ?? "",
    email: member?.email ?? "",
  });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const missing = (k: (typeof REQUIRED)[number]) => tried && !form[k].trim();

  async function handleSave() {
    setTried(true);
    if (REQUIRED.some((k) => !form[k].trim())) {
      setMsg({ ok: false, text: t("register_required") });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { member: updated, profileComplete } = await updateProfile(form);
      setMember(updated, profileComplete);
      setMsg({ ok: true, text: t("profile_saved") });
    } catch {
      setMsg({ ok: false, text: t("profile_saveFailed") });
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
          <div className="min-w-0">
            <p className="font-bold truncate">{member?.display_name}</p>
            {member?.line_display_name && (
              <p className="text-xs text-muted truncate">
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
          <Field label={t("profile_genderLabel")} required invalid={missing("gender")}>
            <GenderSelect value={form.gender} onChange={set("gender")} invalid={missing("gender")} />
          </Field>
          <Field label={t("profile_birthdayLabel")} required invalid={missing("birthday")}>
            <TextInput
              type="date"
              value={form.birthday}
              onChange={set("birthday")}
              max={todayInTaipei()}
              invalid={missing("birthday")}
            />
          </Field>
        </div>

        <fieldset className="rounded-2xl border border-border p-3 space-y-3 min-w-0">
          <legend className="px-1 text-sm font-bold">{t("profile_ecTitle")}</legend>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("register_ecName")} required invalid={missing("emergency_contact_name")}>
              <TextInput
                value={form.emergency_contact_name}
                onChange={set("emergency_contact_name")}
                invalid={missing("emergency_contact_name")}
              />
            </Field>
            <Field label={t("register_ecRelation")} required invalid={missing("emergency_contact_relation")}>
              <ContactRelationSelect
                value={form.emergency_contact_relation}
                onChange={set("emergency_contact_relation")}
                invalid={missing("emergency_contact_relation")}
              />
            </Field>
          </div>
          <Field label={t("register_ecPhone")} required invalid={missing("emergency_contact_phone")}>
            <TextInput
              type="tel"
              value={form.emergency_contact_phone}
              onChange={set("emergency_contact_phone")}
              invalid={missing("emergency_contact_phone")}
            />
          </Field>
        </fieldset>

        <Field label={t("profile_emailLabel")}>
          <TextInput type="email" value={form.email} onChange={set("email")} placeholder={t("profile_emailPlaceholder")} />
        </Field>

        {msg && (
          <p
            className={`text-center text-sm rounded-lg py-2 px-3 ${
              msg.ok ? "text-brand bg-brand/10" : "text-accent bg-accent/10"
            }`}
          >
            {msg.text}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={busy}
          className="w-full rounded-2xl bg-brand text-brand-ink py-4 font-bold shadow-card hover:bg-brand-strong disabled:opacity-50 disabled:hover:bg-brand"
        >
          {busy ? t("common_saving") : t("common_save")}
        </button>

        <Link href="/family" className="block text-center text-sm text-brand border border-brand/30 rounded-2xl py-3">
          {t("profile_familyLink")} →
        </Link>
      </div>
    </div>
  );
}

function Locked({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-sm text-muted">{label}</span>
      <div className="mt-1 w-full rounded-xl border border-border bg-gray-50 px-4 py-3 text-gray-600 truncate">
        {value || "—"}
      </div>
    </div>
  );
}
