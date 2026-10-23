// 把資料庫函式/API 丟出的錯誤碼，轉成給使用者看的訊息（支援中/英）。
import { t, hasKey, type Locale } from "./i18n";

const KNOWN_CODES = [
  "SESSION_NOT_FOUND",
  "SESSION_CANCELLED",
  "SESSION_PAST",
  "BOOKING_CLOSED",
  "FULL",
  "NO_CREDITS",
  "NOT_ELIGIBLE",
  "ALREADY_BOOKED",
  "BOOKING_NOT_FOUND",
  "NOT_YOURS",
  "NOT_YOUR_FAMILY",
  "NOT_ACTIVE",
  "TOO_LATE",
  "MISSING_USER",
  "MEMBER_NOT_FOUND",
  "PROFILE_INCOMPLETE",
] as const;

/** 從 Supabase RPC 的錯誤訊息中抽出我們自訂的錯誤碼 */
export function extractErrorCode(message: string | undefined): string {
  if (!message) return "UNKNOWN";
  for (const code of KNOWN_CODES) {
    if (message.includes(code)) return code;
  }
  return "UNKNOWN";
}

export function messageForCode(code: string, locale: Locale = "zh"): string {
  const key = `err_${code}`;
  return hasKey(key) ? t(locale, key) : t(locale, "err_UNKNOWN");
}
