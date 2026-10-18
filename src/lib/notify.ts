import { shortDate, hhmm } from "./date-utils";
import { t, type Locale } from "./i18n";

// 通知訊息共用格式（中/英）
export function sessionBlock(
  locale: Locale,
  s: {
    title: string;
    session_date: string;
    start_time: string;
    end_time: string;
    coach_name: string | null;
  }
): string {
  return `${s.title}\n${shortDate(s.session_date, locale)} ${hhmm(s.start_time)}–${hhmm(
    s.end_time
  )}\n${t(locale, "notify_coach")}：${s.coach_name ?? "—"}`;
}
