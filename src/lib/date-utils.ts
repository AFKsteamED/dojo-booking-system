// 日期小工具（一律以本地日期字串 YYYY-MM-DD 處理，配合台北時區使用情境）

const WEEKDAY_TW = ["日", "一", "二", "三", "四", "五", "六"];

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 以台北時區取得今天日期字串（YYYY-MM-DD）。
// 伺服器在 Vercel 跑 UTC，直接用 new Date() 會在台灣清晨算成昨天，
// 凡是「伺服器端」判斷今天都要用這個。
export function todayInTaipei(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

// 對 YYYY-MM-DD 字串做加減天數（純日期運算，不受時區影響）
export function addDaysStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// 星期幾（0=日）。用純日期運算，伺服器在 UTC 也不會算錯一天。
function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function weekdayTW(dateStr: string): string {
  return WEEKDAY_TW[dayOfWeek(dateStr)];
}

/** 從今天起，回傳連續 n 天的日期字串 */
export function nextNDays(n: number, start = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(toDateStr(addDays(start, i)));
  return out;
}

/** "19:30:00" → "19:30" */
export function hhmm(time: string): string {
  return time.slice(0, 5);
}

/** 顯示用："7/24（五）" */
export function shortDateTW(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}（${weekdayTW(dateStr)}）`;
}

const WEEKDAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 依語言回傳星期：中文「五」／英文「Fri」 */
export function weekdayLabel(dateStr: string, locale: "zh" | "en"): string {
  return locale === "zh" ? weekdayTW(dateStr) : WEEKDAY_EN[dayOfWeek(dateStr)];
}

/** 依語言顯示日期：中文「7/24（五）」／英文「Fri 7/24」 */
export function shortDate(dateStr: string, locale: "zh" | "en"): string {
  if (locale === "zh") return shortDateTW(dateStr);
  const [, m, d] = dateStr.split("-");
  return `${weekdayLabel(dateStr, "en")} ${Number(m)}/${Number(d)}`;
}
