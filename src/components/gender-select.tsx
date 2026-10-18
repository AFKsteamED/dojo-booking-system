"use client";

import { useLiff } from "@/components/liff-provider";
import { GENDERS } from "@/lib/profile";

export function GenderSelect({
  value,
  onChange,
  small,
}: {
  value: string;
  onChange: (v: string) => void;
  small?: boolean;
}) {
  const { t } = useLiff();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border border-border bg-surface outline-none focus:border-brand ${
        small ? "rounded-lg px-3 py-2 text-sm" : "rounded-xl px-4 py-3"
      }`}
    >
      <option value="">{t("gender_select")}</option>
      {GENDERS.map((g) => (
        <option key={g} value={g}>
          {t(`gender_${g}`)}
        </option>
      ))}
    </select>
  );
}
