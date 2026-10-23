import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { relOne } from "@/lib/rel";
import { pushText } from "@/lib/line-push";
import { sessionBlock } from "@/lib/notify";
import { resolveNotifyTargets } from "@/lib/notify-targets";
import { todayInTaipei, addDaysStr } from "@/lib/date-utils";
import { bookingDeadlineMs } from "@/lib/session-status";
import { t } from "@/lib/i18n";

// 預約截止處理（由 Supabase pg_cron 每 10 分鐘呼叫，見 db/08_cron_close_sessions.sql）。
// 已到截止時間（開課前 3 小時）且尚未處理的課：
//   人數 ≥ 最低開班人數 → 照常開課（僅標記已處理）
//   人數不足 → 停課、全數退堂、LINE 通知已預約者（代管成員通知其帳號持有人）
// 實際判斷與退堂在資料庫函式 close_session() 內以單一交易完成，重複呼叫安全。
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET_NOT_SET" }, { status: 503 });
  }
  // 只接受 Authorization header（不收網址參數，避免密鑰出現在存取紀錄）
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const today = todayInTaipei();
  const supa = getServiceSupabase();
  // 截止時間可能落在今天或「明天凌晨的課」的前一天，因此看今天與明天
  const { data: candidates } = await supa
    .from("class_sessions")
    .select("id, title, session_date, start_time, end_time, min_attendance, coach:coaches(name)")
    .eq("status", "scheduled")
    .is("closed_at", null)
    .gte("session_date", today)
    .lte("session_date", addDaysStr(today, 1));

  const now = Date.now();
  const due = (candidates ?? []).filter(
    (s) => bookingDeadlineMs({ session_date: s.session_date as string, start_time: s.start_time as string }) <= now
  );

  let cancelled = 0;
  let notified = 0;
  for (const s of due) {
    const { data: result, error } = await supa.rpc("close_session", { p_session_id: s.id });
    if (error || !result?.cancelled) continue;
    cancelled++;

    const memberIds: string[] = Array.isArray(result.members) ? result.members : [];
    const targets = await resolveNotifyTargets(memberIds);
    for (const target of targets) {
      const block = sessionBlock(target.locale, {
        title: s.title as string,
        session_date: s.session_date as string,
        start_time: s.start_time as string,
        end_time: s.end_time as string,
        coach_name: relOne<{ name: string }>(s.coach)?.name ?? null,
      });
      const forSuffix = target.forName ? t(target.locale, "notify_for", { name: target.forName }) : "";
      const text = `${t(target.locale, "notify_insufficientTitle")}${forSuffix}\n\n${block}\n\n${t(
        target.locale,
        "notify_insufficientNote",
        { min: s.min_attendance as number }
      )}`;
      if (await pushText(target.lineUserId, text)) notified++;
    }
  }

  return NextResponse.json({ checked: due.length, cancelled, notified });
}
