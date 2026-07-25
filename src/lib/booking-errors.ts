// 把資料庫函式丟出的錯誤碼，轉成給使用者看的中文訊息。
// （前後端共用）

export const BOOKING_ERROR_MESSAGES: Record<string, string> = {
  SESSION_NOT_FOUND: "找不到這堂課",
  SESSION_CANCELLED: "這堂課已停課",
  SESSION_PAST: "這堂課已經開始或結束了",
  FULL: "這堂課名額已滿",
  NO_CREDITS: "剩餘堂數不足，或堂數不在有效期內",
  NOT_ELIGIBLE: "你不在這堂私人課程的參與名單中",
  ALREADY_BOOKED: "你已經預約過這堂課了",
  BOOKING_NOT_FOUND: "找不到這筆預約",
  NOT_YOURS: "這不是你的預約",
  NOT_ACTIVE: "這筆預約無法取消（可能已取消或已結束）",
  TOO_LATE: "已超過可取消時間（開課前 3 小時內不可取消）",
  MISSING_USER: "尚未取得你的 LINE 身分",
  MEMBER_NOT_FOUND: "找不到會員資料",
  PROFILE_INCOMPLETE: "請先完成個人檔案（姓名與電話）",
};

/** 從 Supabase RPC 的錯誤訊息中抽出我們自訂的錯誤碼 */
export function extractErrorCode(message: string | undefined): string {
  if (!message) return "UNKNOWN";
  for (const code of Object.keys(BOOKING_ERROR_MESSAGES)) {
    if (message.includes(code)) return code;
  }
  return "UNKNOWN";
}

export function messageForCode(code: string): string {
  return BOOKING_ERROR_MESSAGES[code] ?? "發生錯誤，請稍後再試";
}
