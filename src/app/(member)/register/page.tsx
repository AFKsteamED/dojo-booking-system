"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
import { Field, TextInput, GenderSelect, ContactRelationSelect } from "@/components/form";
import { Wordmark } from "@/components/wordmark";
import { register } from "@/lib/client-api";
import { todayInTaipei } from "@/lib/date-utils";

const REQUIRED = [
  "display_name",
  "phone",
  "gender",
  "birthday",
  "emergency_contact_name",
  "emergency_contact_relation",
  "emergency_contact_phone",
] as const;

// 首次登入的註冊頁：LINE 只是登入帳號，這裡填真實資料。
export default function RegisterPage() {
  const router = useRouter();
  const { member, profile, setMember, t } = useLiff();
  const phoneLocked = !!member?.phone?.trim(); // 舊會員之前已填過電話

  const [form, setForm] = useState({
    display_name: "", // 刻意不預填 LINE 暱稱，避免直接按送出
    phone: member?.phone ?? "",
    gender: "",
    birthday: "",
    emergency_contact_name: "",
    emergency_contact_relation: "",
    emergency_contact_phone: "",
    email: member?.email ?? "",
  });
  const [tried, setTried] = useState(false); // 按過送出後才顯示紅框
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 已註冊過的人不該停在這頁（剛註冊完正在看完成畫面的除外）
  useEffect(() => {
    if (member?.registered_at && !done) router.replace("/");
  }, [member?.registered_at, done, router]);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const missing = (k: (typeof REQUIRED)[number]) => tried && !form[k].trim();

  async function submit() {
    setTried(true);
    if (REQUIRED.some((k) => !form[k].trim())) {
      setMsg(t("register_required"));
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { member: updated, profileComplete } = await register(form);
      setDone(true);
      setMember(updated, profileComplete);
    } catch {
      setMsg(t("register_failed"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex-1 flex flex-col justify-center px-6 py-10 text-center gap-4">
        <h1 className="text-2xl font-extrabold">{t("register_doneTitle")}</h1>
        <p className="text-sm text-muted">{t("register_doneIntro")}</p>
        <button
          onClick={() => router.replace("/family")}
          className="w-full rounded-2xl border border-brand/40 text-brand py-3 font-bold"
        >
          ＋ {t("register_addMember")}
        </button>
        <button
          onClick={() => router.replace("/")}
          className="w-full rounded-2xl bg-brand text-brand-ink py-4 font-bold shadow-card hover:bg-brand-strong"
        >
          {t("register_startBooking")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-4 pt-5 pb-2 pr-16">
        <Wordmark className="text-[11px]" />
        <h1 className="text-2xl font-extrabold mt-1">{t("register_title")}</h1>
        <p className="text-sm text-muted mt-1">{t("register_intro")}</p>
        {profile?.displayName && (
          <p className="text-xs text-muted mt-1">{t("profile_lineNickname", { name: profile.displayName })}</p>
        )}
      </header>

      <div className="p-4 space-y-4">
        <Field label={t("register_nameLabel")} required hint={t("register_nameHint")} invalid={missing("display_name")}>
          <TextInput
            value={form.display_name}
            onChange={set("display_name")}
            placeholder={t("register_namePlaceholder")}
            invalid={missing("display_name")}
          />
        </Field>

        <Field label={t("register_phoneLabel")} required invalid={missing("phone")}>
          {phoneLocked ? (
            <div className="w-full rounded-xl border border-border bg-gray-50 px-4 py-3 text-gray-600">{form.phone}</div>
          ) : (
            <TextInput
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder={t("profile_phonePlaceholder")}
              invalid={missing("phone")}
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("register_genderLabel")} required invalid={missing("gender")}>
            <GenderSelect value={form.gender} onChange={set("gender")} invalid={missing("gender")} />
          </Field>
          <Field label={t("register_birthdayLabel")} required invalid={missing("birthday")}>
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
          <legend className="px-1 text-sm font-bold">{t("register_ecTitle")}</legend>
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
              placeholder={t("profile_phonePlaceholder")}
              invalid={missing("emergency_contact_phone")}
            />
          </Field>
        </fieldset>

        <Field label={t("register_emailLabel")}>
          <TextInput type="email" value={form.email} onChange={set("email")} />
        </Field>

        {msg && <p className="text-center text-sm text-accent bg-accent/10 rounded-lg py-2 px-3">{msg}</p>}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-2xl bg-brand text-brand-ink py-4 font-bold shadow-card hover:bg-brand-strong disabled:opacity-50 disabled:hover:bg-brand"
        >
          {busy ? t("register_submitting") : t("register_submit")}
        </button>
      </div>
    </div>
  );
}
