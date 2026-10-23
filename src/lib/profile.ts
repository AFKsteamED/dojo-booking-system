// 學員資料共用規則（前後端共用）
import type { Gender, ContactRelation, MemberRelation } from "./types";

export const GENDERS: Gender[] = ["male", "female", "undisclosed"];
export const CONTACT_RELATIONS: ContactRelation[] = [
  "father",
  "mother",
  "spouse",
  "child",
  "sibling",
  "friend",
  "other",
];
export const MEMBER_RELATIONS: MemberRelation[] = ["child", "spouse", "parent", "sibling", "friend", "other"];

export function isGender(v: unknown): v is Gender {
  return typeof v === "string" && (GENDERS as string[]).includes(v);
}

export function isContactRelation(v: unknown): v is ContactRelation {
  return typeof v === "string" && (CONTACT_RELATIONS as string[]).includes(v);
}

export function isMemberRelation(v: unknown): v is MemberRelation {
  return typeof v === "string" && (MEMBER_RELATIONS as string[]).includes(v);
}

/** YYYY-MM-DD，且不能是未來日期 */
export function isValidBirthday(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.getTime() <= Date.now();
}

export function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
