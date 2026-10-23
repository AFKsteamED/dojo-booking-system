"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
import {
  Field,
  TextInput,
  GenderSelect,
  ContactRelationSelect,
  MemberRelationSelect,
} from "@/components/form";
import { addDependent, updateDependent } from "@/lib/client-api";
import { todayInTaipei } from "@/lib/date-utils";
import type { Member } from "@/lib/types";

const EMPTY = {
  display_name: "",
  relation: "",
  gender: "",
  birthday: "",
  phone: "",
  emergency_contact_name: "",
  emergency_contact_relation: "",
  emergency_contact_phone: "",
};
const REQUIRED = ["display_name", "relation", "gender", "birthday"] as const;

// 成員管理：帳號持有人替家人或朋友（孩童、長輩、沒有 LINE 的人）建立資料並代為預約
export default function FamilyPage() {
  const router = useRouter();
  const { dependents, reloadHousehold, t } = useLiff();

  const [form, setForm] = useState(EMPTY);
  // null＝自動：還沒有任何成員時直接展開表單（成員清單是非同步載入的）
  const [openState, setOpen] = useState<boolean | null>(null);
  const open = openState ?? dependents.length === 0;
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const missing = (k: (typeof REQUIRED)[number]) => tried && !form[k].trim();

  async function handleAdd() {
    setTried(true);
    if (REQUIRED.some((k) => !form[k].trim())) {
      setMsg({ ok: false, text: t("register_required") });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await addDependent({
        display_name: form.display_name.trim(),
        relation: form.relation,
        gender: form.gender,
        birthday: form.birthday,
        phone: form.phone.trim() || undefined,
        emergency_contact_name: form.emergency_contact_name.trim() || undefined,
        emergency_contact_relation: form.emergency_contact_relation || undefined,
        emergency_contact_phone: form.emergency_contact_phone.trim() || undefined,
      });
      setForm(EMPTY);
      setTried(false);
      setOpen(false);
      setMsg({ ok: true, text: t("family_added") });
      reloadHousehold();
    } catch {
      setMsg({ ok: false, text: t("profile_saveFailed") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3 pr-16">
        <button onClick={() => router.back()} className="text-muted text-xl" aria-label="back">
          ‹
        </button>
        <h1 className="text-xl font-bold">{t("family_title")}</h1>
      </header>

      <div className="p-4 space-y-4">
        <p className="text-xs text-muted leading-relaxed">{t("family_intro")}</p>

        {msg && (
          <p
            className={`text-center text-sm rounded-lg py-2 px-3 ${
              msg.ok ? "text-brand bg-brand/10" : "text-accent bg-accent/10"
            }`}
          >
            {msg.text}
          </p>
        )}

        {!open ? (
          <button
            onClick={() => {
              setOpen(true);
              setMsg(null);
            }}
            className="w-full rounded-2xl border border-dashed border-brand/50 text-brand py-3 font-bold"
          >
            ＋ {t("family_addTitle")}
          </button>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
            <p className="font-bold text-sm">{t("family_addTitle")}</p>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={t("family_nameLabel")}
                required
                invalid={missing("display_name")}
              >
                <TextInput
                  value={form.display_name}
                  onChange={set("display_name")}
                  placeholder={t("family_namePlaceholder")}
                  invalid={missing("display_name")}
                />
              </Field>
              <Field label={t("family_relationLabel")} required invalid={missing("relation")}>
                <MemberRelationSelect value={form.relation} onChange={set("relation")} invalid={missing("relation")} />
              </Field>
            </div>
            <p className="text-[11px] text-muted -mt-1">{t("family_nameLockedNote")}</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("family_genderLabel")} required invalid={missing("gender")}>
                <GenderSelect value={form.gender} onChange={set("gender")} invalid={missing("gender")} />
              </Field>
              <Field label={t("family_birthdayLabel")} required invalid={missing("birthday")}>
                <TextInput
                  type="date"
                  value={form.birthday}
                  onChange={set("birthday")}
                  max={todayInTaipei()}
                  invalid={missing("birthday")}
                />
              </Field>
            </div>
            <Field label={t("family_phoneLabel")}>
              <TextInput type="tel" value={form.phone} onChange={set("phone")} />
            </Field>
            <EmergencyFields
              name={form.emergency_contact_name}
              relation={form.emergency_contact_relation}
              phone={form.emergency_contact_phone}
              onName={set("emergency_contact_name")}
              onRelation={set("emergency_contact_relation")}
              onPhone={set("emergency_contact_phone")}
            />
            <div className="flex gap-2">
              {dependents.length > 0 && (
                <button
                  onClick={() => {
                    setOpen(false);
                    setTried(false);
                    setMsg(null);
                  }}
                  className="flex-1 rounded-xl border border-border text-muted py-3 font-bold"
                >
                  {t("family_close")}
                </button>
              )}
              <button
                onClick={handleAdd}
                disabled={busy}
                className="flex-[2] rounded-xl bg-brand text-brand-ink py-3 font-bold hover:bg-brand-strong disabled:opacity-50"
              >
                {busy ? t("common_processing") : t("family_addButton")}
              </button>
            </div>
          </div>
        )}

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

function EmergencyFields(p: {
  name: string;
  relation: string;
  phone: string;
  onName: (v: string) => void;
  onRelation: (v: string) => void;
  onPhone: (v: string) => void;
  small?: boolean;
}) {
  const { t } = useLiff();
  return (
    <fieldset className="rounded-xl border border-border p-3 space-y-2 min-w-0">
      <legend className="px-1 text-xs text-muted">{t("family_ecHint")}</legend>
      <div className="grid grid-cols-2 gap-2">
        <TextInput value={p.name} onChange={p.onName} placeholder={t("register_ecName")} ariaLabel={t("register_ecName")} small={p.small} />
        <ContactRelationSelect value={p.relation} onChange={p.onRelation} ariaLabel={t("register_ecRelation")} small={p.small} />
      </div>
      <TextInput type="tel" value={p.phone} onChange={p.onPhone} placeholder={t("register_ecPhone")} ariaLabel={t("register_ecPhone")} small={p.small} />
    </fieldset>
  );
}

function DependentRow({ dependent, onSaved }: { dependent: Member; onSaved: () => void }) {
  const { t, locale } = useLiff();
  const initial = {
    relation: dependent.relation ?? "",
    gender: dependent.gender ?? "",
    birthday: dependent.birthday ?? "",
    phone: dependent.phone ?? "",
    emergency_contact_name: dependent.emergency_contact_name ?? "",
    emergency_contact_relation: dependent.emergency_contact_relation ?? "",
    emergency_contact_phone: dependent.emergency_contact_phone ?? "",
  };
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((k) => form[k] !== initial[k]);
  const valid = !!form.relation && !!form.gender && !!form.birthday;
  const set = (k: keyof typeof initial) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!valid) return;
    setBusy(true);
    try {
      await updateDependent(dependent.id, form);
      setSaved(true);
      setEditing(false);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  const summary = [
    dependent.gender ? t(`gender_${dependent.gender}`) : null,
    dependent.birthday ? dependent.birthday.replaceAll("-", "/") : null,
  ]
    .filter(Boolean)
    .join(locale === "en" ? " · " : "・");

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold truncate">{dependent.display_name}</p>
            {dependent.relation && (
              <span className="shrink-0 text-[11px] bg-brand/10 text-brand rounded-full px-2 py-0.5">
                {t(`relation_${dependent.relation}`)}
              </span>
            )}
          </div>
          {summary && <p className="text-xs text-muted mt-0.5">{summary}</p>}
        </div>
        {saved && <span className="text-xs text-brand">{t("family_saved")}</span>}
        <button
          onClick={() => {
            if (editing) setForm(initial);
            setEditing((v) => !v);
          }}
          className="shrink-0 text-sm text-brand border border-brand/30 rounded-lg px-3 py-1"
        >
          {editing ? t("family_close") : t("family_edit")}
        </button>
      </div>

      {editing && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("family_relationLabel")} required invalid={!form.relation}>
              <MemberRelationSelect value={form.relation} onChange={set("relation")} invalid={!form.relation} small />
            </Field>
            <Field label={t("family_genderLabel")} required invalid={!form.gender}>
              <GenderSelect value={form.gender} onChange={set("gender")} invalid={!form.gender} small />
            </Field>
            <Field label={t("family_birthdayLabel")} required invalid={!form.birthday}>
              <TextInput
                type="date"
                value={form.birthday}
                onChange={set("birthday")}
                max={todayInTaipei()}
                invalid={!form.birthday}
                small
              />
            </Field>
            <Field label={t("family_phoneLabel")}>
              <TextInput type="tel" value={form.phone} onChange={set("phone")} small />
            </Field>
          </div>
          <EmergencyFields
            name={form.emergency_contact_name}
            relation={form.emergency_contact_relation}
            phone={form.emergency_contact_phone}
            onName={set("emergency_contact_name")}
            onRelation={set("emergency_contact_relation")}
            onPhone={set("emergency_contact_phone")}
            small
          />
          <button
            onClick={save}
            disabled={busy || !dirty || !valid}
            className="w-full text-sm font-bold bg-brand text-brand-ink rounded-lg py-2 disabled:opacity-40"
          >
            {busy ? t("common_saving") : t("family_saveButton")}
          </button>
        </>
      )}
    </div>
  );
}
