import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";
import { relOne } from "@/lib/rel";

// 某日所有場次（含目前預約人數），供後台總覽
export async function GET(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const date = new URL(req.url).searchParams.get("date");
  if (!date) return NextResponse.json({ error: "MISSING_DATE" }, { status: 400 });

  const supa = getServiceSupabase();
  const { data: sessions, error } = await supa
    .from("class_sessions")
    .select("*, coach:coaches(name)")
    .eq("session_date", date)
    .order("start_time", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (sessions ?? []).map((s) => s.id as string);
  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data: bk } = await supa
      .from("bookings")
      .select("session_id")
      .eq("status", "booked")
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
  return NextResponse.json({ sessions: result });
}
