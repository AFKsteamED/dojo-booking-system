import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getMemberByLineId } from "@/lib/server-db";
import { extractErrorCode } from "@/lib/booking-errors";

// 取消預約（開課前 3 小時外可退堂）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { lineUserId } = body;
  if (!lineUserId) return NextResponse.json({ error: "MISSING_USER" }, { status: 400 });

  const member = await getMemberByLineId(lineUserId);
  if (!member) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });

  const supa = getServiceSupabase();
  const { error } = await supa.rpc("cancel_booking", {
    p_member_id: member.id,
    p_booking_id: id,
  });

  if (error) {
    const code = extractErrorCode(error.message);
    return NextResponse.json({ error: code }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
