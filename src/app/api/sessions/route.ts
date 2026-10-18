import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionMember, getDependents, getEligibleSetsUnion, canSeePrivate } from "@/lib/server-db";
import { relOne } from "@/lib/rel";

// 取某段日期範圍、「這位會員看得到」的課程場次。
// 公開課所有人可見；私人課只有參與名單內的會員可見。
// 用法：/api/sessions?from=2026-07-24&to=2026-07-31
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to") ?? from;
  if (!from) {
    return NextResponse.json({ error: "MISSING_RANGE" }, { status: 400 });
  }

  const supa = getServiceSupabase();
  const { data: sessions, error } = await supa
    .from("class_sessions")
    .select("*, coach:coaches(name)")
    .gte("session_date", from)
    .lte("session_date", to)
    .eq("status", "scheduled")
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 這個家庭（本人 + 小孩）可參與的私人課聯集（範本層級 + 單堂層級）
  // 這樣家長不用切換身份，就能在課表上看到小孩才有資格的私人課
  const member = await getSessionMember();
  const household = member ? [member.id, ...(await getDependents(member.id)).map((d) => d.id)] : [];
  const eligible = await getEligibleSetsUnion(household);

  const visible = (sessions ?? []).filter((s) =>
    canSeePrivate(
      { visibility: s.visibility as string, template_id: s.template_id as string | null, id: s.id as string },
      eligible
    )
  );

  const ids = visible.map((s) => s.id as string);
  const counts = await countBookings(ids);

  const result = visible.map((s) => {
    const booked = counts[s.id as string] ?? 0;
    return {
      ...s,
      coach_name: relOne<{ name: string }>(s.coach)?.name ?? null,
      booked_count: booked,
      remaining: (s.capacity as number) - booked,
    };
  });

  return NextResponse.json({ sessions: result });
}

async function countBookings(sessionIds: string[]): Promise<Record<string, number>> {
  if (sessionIds.length === 0) return {};
  const supa = getServiceSupabase();
  const { data } = await supa
    .from("bookings")
    .select("session_id")
    .eq("status", "booked")
    .in("session_id", sessionIds);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const sid = row.session_id as string;
    counts[sid] = (counts[sid] ?? 0) + 1;
  }
  return counts;
}
