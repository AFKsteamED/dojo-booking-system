// 日期小工具（一律以本地日期字串 YYYY-MM-DD 處理，配合台北時區使用情境）

const WEEKDAY_TW = ["日", "一", "二", "三", "四", "五", "六"];

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function weekdayTW(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+08:00`);
  return WEEKDAY_TW[d.getDay()];
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
