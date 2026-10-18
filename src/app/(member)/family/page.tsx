"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
import { GenderSelect } from "@/components/gender-select";
import { addDependent, updateDependent } from "@/lib/client-api";
import { todayInTaipei } from "@/lib/date-utils";
import type { Member } from "@/lib/types";

const EMPTY = {
  display_name: "",
  gender: "",
  birthday: "",
  phone: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
};

export default function FamilyPage() {
  const router = useRouter();
  const { dependents, reloadHousehold, t } = useLiff();

  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleAdd() {
    if (!form.display_name.trim() || !form.gender || !form.birthday) {
      setMsg(t("family_required"));
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await addDependent({
        display_name: form.display_name.trim(),
        gender: form.gender,
        birthday: form.birthday,
        phone: form.phone.trim() || undefined,
        emergency_contact_name: form.emergency_contact_name.trim() || undefined,
        emergency_contact_phone: form.emergency_contact_phone.trim() || undefined,
      });
      setForm(EMPTY);
      setMsg(t("family_added"));
      reloadHousehold();
    } catch {
      setMsg(t("profile_saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3 pr-16">
        <button onClick={() => router.back()} className="text-muted text-xl">‹</button>
        <h1 className="text-xl font-bold">{t("family_title")}</h1>
      </header>

      <div className="p-4 space-y-4">
        <p className="text-xs text-muted">{t("family_intro")}</p>

        <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
          <p className="font-bold text-sm">{t("family_addTitle")}</p>
          <Field label={t("family_nameLabel")} hint={t("family_nameLockedNote")}>
            <Input value={form.display_name} onChange={set("display_name")} placeholder={t("family_namePlaceholder")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("family_genderLabel")}>
              <GenderSelect value={form.gender} onChange={set("gender")} />
            </Field>
            <Field label={t("family_birthdayLabel")}>
              <Input type="date" value={form.birthday} onChange={set("birthday")} max={todayInTaipei()} />
            </Field>
          </div>
          <Field label={t("family_phoneLabel")}>
            <Input type="tel" value={form.phone} onChange={set("phone")} />
          </Field>
          <div>
            <span className="text-sm text-muted">{t("family_ecHint")}</span>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <Input value={form.emergency_contact_name} onChange={set("emergency_contact_name")} placeholder={t("register_ecName")} />
              <Input type="tel" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} placeholder={t("register_ecPhone")} />
            </div>
          </div>
          {msg && <p className="text-sm text-brand">{msg}</p>}
          <button
            onClick={handleAdd}
            disabled={busy}
            className="w-full rounded-xl bg-brand text-brand-ink py-3 font-bold hover:bg-brand-strong disabled:opacity-50"
          >
            {busy ? t("common_processing") : t("family_addButton")}
          </button>
        </div>

        <div>
          <p className="font-bold text-sm mb-2">{t("family_listTitle", { n: dependents.length })}</p>
          {dependents.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">{t("family_noChildren")}</p>
          ) : (
            <div className="space-y-2">
              {dependents.map((d) => (
                <DependentRow key={d.id} dependent={d} onSaved={reloadHousehold} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DependentRow({ dependent, onSaved }: { dependent: Member; onSaved: () => void }) {
  const { t } = useLiff();
  const initial = {
    gender: dependent.gender ?? "",
    birthday: dependent.birthday ?? "",
    phone: dependent.phone ?? "",
    emergency_contact_name: dependent.emergency_contact_name ?? "",
    emergency_contact_phone: dependent.emergency_contact_phone ?? "",
  };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((k) => form[k] !== initial[k]);
  const set = (k: keyof typeof initial) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.gender || !form.birthday) return;
    setBusy(true);
    try {
      await updateDependent(dependent.id, form);
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <p className="font-bold">{dependent.display_name}</p>
        <span className="text-[11px] bg-brand/10 text-brand rounded-full px-2 py-0.5">
          {t("family_relationChild")}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <GenderSelect value={form.gender} onChange={set("gender")} small />
        <Input type="date" value={form.birthday} onChange={set("birthday")} max={todayInTaipei()} small />
        <Input type="tel" value={form.phone} onChange={set("phone")} placeholder={t("family_phoneLabel")} small />
        <Input value={form.emergency_contact_name} onChange={set("emergency_contact_name")} placeholder={t("family_ecName")} small />
      </div>
      <Input type="tel" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} placeholder={t("family_ecPhone")} small />
      {dirty && (
        <button
          onClick={save}
          disabled={busy || !form.gender || !form.birthday}
          className="w-full text-sm text-brand border border-brand/30 rounded-lg py-2 disabled:opacity-50"
        >
          {busy ? t("common_saving") : t("family_saveButton")}
        </button>
      )}
      {saved && <p className="text-xs text-brand">{t("family_saved")}</p>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-sm text-muted">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
    </div>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  max,
  small,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  max?: string;
  small?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full border border-border bg-surface outline-none focus:border-brand ${
        small ? "rounded-lg px-3 py-2 text-sm" : "rounded-xl px-4 py-3"
      }`}
    />
  );
}
