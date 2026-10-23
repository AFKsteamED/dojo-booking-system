"use client";

import { useEffect, useState } from "react";

/** 目前時間（每分鐘更新），讓「已截止 / 停課」等狀態在頁面開著時也會自動跟著變 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
