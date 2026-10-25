// 課表預先載入：開啟 App 時，在等 LINE 初始化、登入同步的同時就先抓課表，
// 課表頁一出現就能直接用，不必等登入完成後才開始載入。
//
// 回訪會員（已有登入 cookie）：預先抓到的就是自己的課表（含「已預約」標記、私人課）。
// 新會員或 cookie 過期：預先抓到的是未登入版本（viewer = null），課表頁會發現不符而重新抓。

import { getSessions } from "@/lib/client-api";
import { todayInTaipei, addDaysStr } from "@/lib/date-utils";

export const SCHEDULE_DAYS = 21;

export function scheduleDays(): string[] {
  const today = todayInTaipei();
  return Array.from({ length: SCHEDULE_DAYS }, (_, i) => addDaysStr(today, i));
}

type Result = Awaited<ReturnType<typeof getSessions>>;
let pending: { key: string; promise: Promise<Result> } | null = null;

/** 開始預先載入（只在要進課表頁時呼叫） */
export function prefetchSchedule() {
  const days = scheduleDays();
  const key = `${days[0]}|${days[days.length - 1]}`;
  const promise = getSessions(days[0], days[days.length - 1]);
  promise.catch(() => {}); // 失敗時由課表頁重新抓，這裡不報錯
  pending = { key, promise };
}

/** 取走預先載入的結果（只能取一次；日期範圍不同就不給） */
export function takePrefetchedSchedule(from: string, to: string): Promise<Result> | null {
  if (!pending || pending.key !== `${from}|${to}`) return null;
  const { promise } = pending;
  pending = null;
  return promise;
}
