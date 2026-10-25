import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionMember, getDependents, getEligibleSetsUnion, canSeePrivate } from "@/lib/server-db";
import { relOne } from "@/lib/rel";

// 取某段日期範圍、「這位會員（含代管成員）看得到」的課程場次。
// 公開課所有人可見；私人課只有名單內的人可見。
// 停課的場次也會回傳（課表上顯示「停課」，而不是直接消失）。
// 用法：/api/sessions?from=2026-07-24&to=2026-07-31
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to") ?? from;
  if (!from) {
    return NextResponse.json({ error: "MISSING_RANGE" }, { status: 400 });
  }

  const supa = getServiceSupabase();
  // 課程與「我是誰＋我的代管成員」同時查，不互相等待
  const [{ data: sessions, error }, viewer] = await Promise.all([
    supa
      .from("class_sessions")
      .select("*, coach:coaches(name)")
      .gte("session_date", from)
      .lte("session_date", to)
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true }),
    getViewer(),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 私人課資格、人數、我家有沒有預約：三個查詢同時進行
  const all = sessions ?? [];
  const allIds = all.map((s) => s.id as string);
  const [eligible, counts, mine] = await Promise.all([
    getEligibleSetsUnion(viewer.household),
    countBookings(allIds),
    householdBooked(allIds, viewer.household),
  ]);

  const visible = all.filter((s) =>
    canSeePrivate(
      { visibility: s.visibility as string, template_id: s.template_id as string | null, id: s.id as string },
      eligible
    )
  );

  const result = visible.map((s) => {
    const booked = counts[s.id as string] ?? 0;
    return {
      ...s,
      coach_name: relOne<{ name: string }>(s.coach)?.name ?? null,
      booked_count: booked,
      remaining: (s.capacity as number) - booked,
      household_booked: mine.has(s.id as string),
    };
  });

  // viewer：這份結果是以哪位會員的身分查的（前端用來判斷預先載入的資料是否可直接使用）
  return NextResponse.json({ sessions: result, viewer: viewer.memberId });
}

async function getViewer(): Promise<{ memberId: string | null; household: string[] }> {
  const member = await getSessionMember();
  if (!member) return { memberId: null, household: [] };
  const dependents = await getDependents(member.id);
  return { memberId: member.id, household: [member.id, ...dependents.map((d) => d.id)] };
}

async function countBookings(sessionIds: string[]): Promise<Record<string, number>> {
  if (sessionIds.length === 0) return {};
  const supa = getServiceSupabase();
  const { data } = await supa
    .from("bookings")
    .select("session_id")
    .in("status", ["booked", "attended", "no_show"]) // 有效預約（點名後狀態會變，但仍佔名額）
    .in("session_id", sessionIds);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const sid = row.session_id as string;
    counts[sid] = (counts[sid] ?? 0) + 1;
  }
  return counts;
}

// 我或我代管的成員有預約的場次
async function householdBooked(sessionIds: string[], memberIds: string[]): Promise<Set<string>> {
  if (sessionIds.length === 0 || memberIds.length === 0) return new Set();
  const supa = getServiceSupabase();
  const { data } = await supa
    .from("bookings")
    .select("session_id")
    .in("status", ["booked", "attended"])
    .in("session_id", sessionIds)
    .in("member_id", memberIds);
  return new Set((data ?? []).map((r) => r.session_id as string));
}
