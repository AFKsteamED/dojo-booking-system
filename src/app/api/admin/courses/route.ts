import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";

// 新增課程：單堂(once) 或 每週重複(weekly)；公開 或 私人（帶參與名單）
// body: {
//   visibility: 'public'|'private',
//   recurrence: 'once'|'weekly',
//   title, coach_id, capacity, start_time, end_time,
//   session_date?  (once),
//   weekday?        (weekly, 0-6),
//   member_ids?: string[]  (私人課的參與名單)
// }
export async function POST(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const b = await req.json().catch(() => ({}));
  const visibility = b.visibility === "private" ? "private" : "public";
  const capacity = Number(b.capacity);
  const memberIds: string[] = Array.isArray(b.member_ids) ? b.member_ids : [];
  // 最低開班人數：未填時公開課 4 人、私人課 1 人
  const minAttendance =
    b.min_attendance !== undefined && b.min_attendance !== "" ? Number(b.min_attendance) : visibility === "private" ? 1 : 4;

  if (
    !b.title?.trim() ||
    !b.start_time ||
    !b.end_time ||
    !Number.isInteger(capacity) ||
    capacity <= 0 ||
    !Number.isInteger(minAttendance) ||
    minAttendance < 1 ||
    minAttendance > capacity
  ) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const supa = getServiceSupabase();

  if (b.recurrence === "weekly") {
    const weekday = Number(b.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return NextResponse.json({ error: "INVALID_WEEKDAY" }, { status: 400 });
    }
    const { data: tpl, error } = await supa
      .from("class_templates")
      .insert({
        title: b.title.trim(),
        coach_id: b.coach_id || null,
        weekday,
        start_time: b.start_time,
        end_time: b.end_time,
        capacity,
        min_attendance: minAttendance,
        visibility,
        active: true,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (visibility === "private" && memberIds.length) {
      await supa
        .from("template_members")
        .insert(memberIds.map((m) => ({ template_id: tpl.id, member_id: m })));
    }
    // 立即產生未來 8 週場次
    await supa.rpc("generate_sessions", { p_weeks: 8 });
    return NextResponse.json({ ok: true, templateId: tpl.id });
  }

  // once（單堂）
  if (!b.session_date) {
    return NextResponse.json({ error: "MISSING_DATE" }, { status: 400 });
  }
  const { data: sess, error } = await supa
    .from("class_sessions")
    .insert({
      template_id: null,
      coach_id: b.coach_id || null,
      title: b.title.trim(),
      session_date: b.session_date,
      start_time: b.start_time,
      end_time: b.end_time,
      capacity,
      min_attendance: minAttendance,
      visibility,
      status: "scheduled",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (visibility === "private" && memberIds.length) {
    await supa
      .from("session_members")
      .insert(memberIds.map((m) => ({ session_id: sess.id, member_id: m })));
  }
  return NextResponse.json({ ok: true, sessionId: sess.id });
}
