"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
import { GenderSelect } from "@/components/gender-select";
import { Wordmark } from "@/components/wordmark";
import { register } from "@/lib/client-api";
import { todayInTaipei } from "@/lib/date-utils";

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
    emergency_contact_phone: "",
    email: member?.email ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 已註冊過的人不該停在這頁（剛註冊完正在看完成畫面的除外）
  useEffect(() => {
    if (member?.registered_at && !done) router.replace("/");
  }, [member?.registered_at, done, router]);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const required = [
      form.display_name,
      form.phone,
      form.gender,
      form.birthday,
      form.emergency_contact_name,
      form.emergency_contact_phone,
    ];
    if (required.some((v) => !v.trim())) {
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
          ＋ {t("register_addChild")}
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
          <p className="text-xs text-muted mt-1">
            {t("profile_lineNickname", { name: profile.displayName })}
          </p>
        )}
      </header>

      <div className="p-4 space-y-4">
        <Field label={t("register_nameLabel")} hint={t("register_nameHint")}>
          <Input value={form.display_name} onChange={set("display_name")} placeholder={t("register_namePlaceholder")} />
        </Field>

        <Field label={t("register_phoneLabel")}>
          {phoneLocked ? (
            <div className="w-full rounded-xl border border-border bg-gray-50 px-4 py-3 text-gray-600">
              {form.phone}
            </div>
          ) : (
            <Input type="tel" value={form.phone} onChange={set("phone")} placeholder={t("profile_phonePlaceholder")} />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("register_genderLabel")}>
            <GenderSelect value={form.gender} onChange={set("gender")} />
          </Field>
          <Field label={t("register_birthdayLabel")}>
            <Input type="date" value={form.birthday} onChange={set("birthday")} max={todayInTaipei()} />
          </Field>
        </div>

        <div>
          <span className="text-sm text-muted">{t("register_ecTitle")}</span>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <Input value={form.emergency_contact_name} onChange={set("emergency_contact_name")} placeholder={t("register_ecName")} />
            <Input type="tel" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} placeholder={t("register_ecPhone")} />
          </div>
        </div>

        <Field label={t("register_emailLabel")}>
          <Input type="email" value={form.email} onChange={set("email")} />
        </Field>

        {msg && <p className="text-center text-sm text-accent bg-accent/10 rounded-lg py-2">{msg}</p>}

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
