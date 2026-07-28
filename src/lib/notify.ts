import { shortDateTW, hhmm } from "./date-utils";

// 通知訊息共用格式
export function sessionBlock(s: {
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  coach_name: string | null;
}): string {
  return `${s.title}\n${shortDateTW(s.session_date)} ${hhmm(s.start_time)}–${hhmm(
    s.end_time
  )}\n教練：${s.coach_name ?? "—"}`;
}
