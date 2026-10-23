import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";
import { relOne } from "@/lib/rel";
import { todayInTaipei, addDaysStr } from "@/lib/date-utils";

// 後台：今天起 N 天內的所有課程（含停課、公開/私人、目前有效預約人數）
// 用法：/api/admin/sessions/upcoming?days=7
export async function GET(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const days = Math.min(60, Math.max(1, Number(new URL(req.url).searchParams.get("days") ?? "7") || 7));
  const today = todayInTaipei();

  const supa = getServiceSupabase();
  const { data: sessions, error } = await supa
    .from("class_sessions")
    .select("*, coach:coaches(name)")
    .gte("session_date", today)
    .lte("session_date", addDaysStr(today, days - 1))
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (sessions ?? []).map((s) => s.id as string);
  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data: bk } = await supa
      .from("bookings")
      .select("session_id")
      .in("status", ["booked", "attended", "no_show"])
      .in("session_id", ids);
    for (const r of bk ?? []) {
      const sid = r.session_id as string;
      counts[sid] = (counts[sid] ?? 0) + 1;
    }
  }

  const result = (sessions ?? []).map((s) => ({
    ...s,
    coach_name: relOne<{ name: string }>(s.coach)?.name ?? null,
    booked_count: counts[s.id as string] ?? 0,
  }));
  return NextResponse.json({ sessions: result, today });
}
