import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionMember } from "@/lib/server-db";
import { extractErrorCode } from "@/lib/booking-errors";
import { relOne } from "@/lib/rel";
import { pushText } from "@/lib/line-push";
import { sessionBlock } from "@/lib/notify";

// 取消預約（開課前 3 小時外可退堂）
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 401 });

  const supa = getServiceSupabase();

  // 取消前先撈場次資訊（供通知用）
  const { data: bk } = await supa
    .from("bookings")
    .select("session:class_sessions(title, session_date, start_time, end_time, coach:coaches(name))")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supa.rpc("cancel_booking", {
    p_member_id: member.id,
    p_booking_id: id,
  });

  if (error) {
    const code = extractErrorCode(error.message);
    return NextResponse.json({ error: code }, { status: 409 });
  }

  // 推播取消確認（失敗不影響取消）
  const s = relOne<{
    title: string;
    session_date: string;
    start_time: string;
    end_time: string;
    coach: unknown;
  }>(bk?.session);
  if (s) {
    const block = sessionBlock({
      title: s.title,
      session_date: s.session_date,
      start_time: s.start_time,
      end_time: s.end_time,
      coach_name: relOne<{ name: string }>(s.coach)?.name ?? null,
    });
    await pushText(member.line_user_id, `🚫 已取消預約\n\n${block}\n\n堂數已退回。`);
  }

  return NextResponse.json({ ok: true });
}
