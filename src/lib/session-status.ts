// 課程狀態判斷（前後端、會員端與後台共用，確保顯示一致）
//
// 規則：
// - 預約截止＝開課前 3 小時（與取消截止相同）
// - 截止時人數 ≥ 最低開班人數 → 照常開課，未預約者看到「已截止」
// - 截止時人數不足 → 停課（排程每 10 分鐘實際執行停課與退堂；排程跑之前畫面就先顯示停課）

export const BOOKING_DEADLINE_HOURS = 3;

type SessionLike = {
  session_date: string;
  start_time: string;
  status: string;
  min_attendance: number;
  booked_count: number;
};

export type SessionState = "open" | "closed" | "cancelled";

export function sessionStartMs(s: { session_date: string; start_time: string }): number {
  return new Date(`${s.session_date}T${s.start_time}+08:00`).getTime();
}

export function bookingDeadlineMs(s: { session_date: string; start_time: string }): number {
  return sessionStartMs(s) - BOOKING_DEADLINE_HOURS * 3600_000;
}

export function sessionState(s: SessionLike, now = Date.now()): SessionState {
  if (s.status === "cancelled") return "cancelled";
  if (now < bookingDeadlineMs(s)) return "open";
  // 已過截止：人數不足且還沒開課 → 停課（等排程正式處理）
  if (s.booked_count < s.min_attendance && now < sessionStartMs(s)) return "cancelled";
  return "closed";
}
