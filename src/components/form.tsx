"use client";

import { useLiff } from "@/components/liff-provider";
import { GENDERS, CONTACT_RELATIONS, MEMBER_RELATIONS } from "@/lib/profile";

// 會員端共用表單元件。
// - required：標籤後自動加紅色 *
// - invalid：紅框 + 下方「此欄位為必填」，提示使用者哪一格沒填

export function Field({
  label,
  required,
  hint,
  invalid,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useLiff();
  return (
    <div className="min-w-0">
      <span className="text-sm text-muted">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
      {invalid ? (
        <p className="text-[11px] text-accent mt-1">{t("form_required")}</p>
      ) : (
        hint && <p className="text-[11px] text-muted mt-1">{hint}</p>
      )}
    </div>
  );
}

function boxClass(invalid?: boolean, small?: boolean) {
  return [
    "w-full min-w-0 bg-surface outline-none border",
    invalid ? "border-accent ring-1 ring-accent/30" : "border-border focus:border-brand",
    small ? "rounded-lg px-3 py-2 text-sm min-h-[38px]" : "rounded-xl px-4 py-3 min-h-[48px]",
  ].join(" ");
}

export function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
  max,
  invalid,
  small,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  max?: string;
  invalid?: boolean;
  small?: boolean;
  ariaLabel?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      max={max}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${boxClass(invalid, small)} ${type === "date" ? "date-input" : ""}`}
    />
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  invalid,
  small,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  invalid?: boolean;
  small?: boolean;
  ariaLabel?: string;
}) {
  const { t } = useLiff();
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
      className={boxClass(invalid, small)}
    >
      <option value="">{t("form_select")}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

type OptionSelectProps = Omit<Parameters<typeof SelectInput>[0], "options">;

export function GenderSelect(props: OptionSelectProps) {
  const { t } = useLiff();
  return <SelectInput {...props} options={GENDERS.map((g) => ({ value: g, label: t(`gender_${g}`) }))} />;
}

/** 緊急聯絡人與會員的關係 */
export function ContactRelationSelect(props: OptionSelectProps) {
  const { t } = useLiff();
  return (
    <SelectInput {...props} options={CONTACT_RELATIONS.map((r) => ({ value: r, label: t(`contact_${r}`) }))} />
  );
}

/** 代訂成員與帳號持有人的關係 */
export function MemberRelationSelect(props: OptionSelectProps) {
  const { t } = useLiff();
  return (
    <SelectInput {...props} options={MEMBER_RELATIONS.map((r) => ({ value: r, label: t(`relation_${r}`) }))} />
  );
}
