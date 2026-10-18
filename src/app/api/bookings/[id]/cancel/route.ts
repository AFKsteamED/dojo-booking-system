import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionMember } from "@/lib/server-db";
import { extractErrorCode } from "@/lib/booking-errors";
import { relOne } from "@/lib/rel";
import { pushText } from "@/lib/line-push";
import { sessionBlock } from "@/lib/notify";
import { t } from "@/lib/i18n";

// 取消預約（開課前 3 小時外可退堂）。家長可以取消自己小孩的預約。
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionMember();
  if (!session) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 401 });

  const supa = getServiceSupabase();

  // 取消前先撈這筆預約屬於誰、哪一堂課（供權限檢查與通知用）
  const { data: bk } = await supa
    .from("bookings")
    .select(
      "member_id, member:members(display_name, guardian_id), session:class_sessions(title, session_date, start_time, end_time, coach:coaches(name))"
    )
    .eq("id", id)
    .maybeSingle();

  if (!bk) return NextResponse.json({ error: "BOOKING_NOT_FOUND" }, { status: 404 });

  const owner = relOne<{ display_name: string; guardian_id: string | null }>(bk.member);
  const ownerId = bk.member_id as string;
  const isSelf = ownerId === session.id;
  const isMyChild = !!owner && owner.guardian_id === session.id;
  if (!isSelf && !isMyChild) {
    return NextResponse.json({ error: "NOT_YOUR_FAMILY" }, { status: 403 });
  }

  const { error } = await supa.rpc("cancel_booking", {
    p_member_id: ownerId,
    p_booking_id: id,
  });

  if (error) {
    const code = extractErrorCode(error.message);
    return NextResponse.json({ error: code }, { status: 409 });
  }

  // 推播取消確認給登入者（家長），小孩沒有 LINE 收不到，訊息會註明是幫誰取消
  const s = relOne<{
    title: string;
    session_date: string;
    start_time: string;
    end_time: string;
    coach: unknown;
  }>(bk.session);
  if (s) {
    const locale = session.locale;
    const block = sessionBlock(locale, {
      title: s.title,
      session_date: s.session_date,
      start_time: s.start_time,
      end_time: s.end_time,
      coach_name: relOne<{ name: string }>(s.coach)?.name ?? null,
    });
    const forSuffix = !isSelf && owner ? t(locale, "notify_for", { name: owner.display_name }) : "";
    await pushText(
      session.line_user_id,
      `${t(locale, "notify_bookCancelled")}${forSuffix}\n\n${block}\n\n${t(locale, "notify_refundNote")}`
    );
  }

  return NextResponse.json({ ok: true });
}
