import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionMember, isProfileComplete } from "@/lib/server-db";
import { extractErrorCode } from "@/lib/booking-errors";
import { relOne } from "@/lib/rel";
import { pushText } from "@/lib/line-push";
import { sessionBlock } from "@/lib/notify";

// 取得我的預約清單（scope=upcoming 預約中 / past 已結束）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "upcoming";

  const member = await getSessionMember();
  if (!member) return NextResponse.json({ bookings: [] });

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("bookings")
    .select("id, status, created_at, session:class_sessions(*, coach:coaches(name))")
    .eq("member_id", member.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const rows = (data ?? []).map((b) => {
    const s = relOne<{
      session_date: string;
      start_time: string;
      end_time: string;
      title: string;
      coach: { name: string } | null;
    }>(b.session);
    // 以台北時間組出開課時間
    const startMs = s
      ? new Date(`${s.session_date}T${s.start_time}+08:00`).getTime()
      : 0;
    return {
      id: b.id as string,
      status: b.status as string,
      title: s?.title ?? "",
      coach_name: relOne<{ name: string }>(s?.coach)?.name ?? null,
      session_date: s?.session_date ?? "",
      start_time: s?.start_time ?? "",
      end_time: s?.end_time ?? "",
      startMs,
    };
  });

  // upcoming = 仍為 booked 且尚未開課；past = 其餘（已取消 / 已過 / 已報到）
  const upcoming = rows
    .filter((r) => r.status === "booked" && r.startMs >= now)
    .sort((a, b) => a.startMs - b.startMs);
  const past = rows
    .filter((r) => !(r.status === "booked" && r.startMs >= now))
    .sort((a, b) => b.startMs - a.startMs);

  return NextResponse.json({ bookings: scope === "past" ? past : upcoming });
}

// 建立預約（扣 1 堂）
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { sessionId } = body;
  if (!sessionId) {
    return NextResponse.json({ error: "MISSING_USER" }, { status: 400 });
  }

  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 401 });
  if (!isProfileComplete(member)) {
    return NextResponse.json({ error: "PROFILE_INCOMPLETE" }, { status: 400 });
  }

  const supa = getServiceSupabase();
  const { data, error } = await supa.rpc("book_session", {
    p_member_id: member.id,
    p_session_id: sessionId,
  });

  if (error) {
    const code = extractErrorCode(error.message);
    return NextResponse.json({ error: code }, { status: 409 });
  }

  // 推播預約確認（失敗不影響預約）
  const { data: sess } = await supa
    .from("class_sessions")
    .select("title, session_date, start_time, end_time, coach:coaches(name)")
    .eq("id", sessionId)
    .maybeSingle();
  if (sess) {
    const block = sessionBlock({
      title: sess.title as string,
      session_date: sess.session_date as string,
      start_time: sess.start_time as string,
      end_time: sess.end_time as string,
      coach_name: relOne<{ name: string }>(sess.coach)?.name ?? null,
    });
    await pushText(member.line_user_id, `✅ 預約成功\n\n${block}\n\n如需取消請於開課前 3 小時完成。`);
  }

  return NextResponse.json({ bookingId: data });
}
