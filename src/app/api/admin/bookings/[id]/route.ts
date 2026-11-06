import { NextRequest, NextResponse, after } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";
import { extractErrorCode } from "@/lib/booking-errors";
import { notifyAdminCancel } from "@/lib/notify-cancel";

// 後台調整單筆預約：報到 / 未到 / 強制取消（退堂）
// body: { action: "attended" | "no_show" | "cancel" }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { action } = await req.json().catch(() => ({}));
  const supa = getServiceSupabase();

  const { data: booking } = await supa.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!booking) return NextResponse.json({ error: "BOOKING_NOT_FOUND" }, { status: 404 });

  if (action === "attended" || action === "no_show") {
    await supa.from("bookings").update({ status: action }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  if (action === "cancel") {
    // 取消並退 1 堂（資料庫單一交易，見 db/11）；已取消過的不會重複退堂
    const { data, error } = await supa.rpc("admin_cancel_booking", { p_booking_id: id });
    if (error) return NextResponse.json({ error: extractErrorCode(error.message) }, { status: 500 });
    const result = data as { cancelled: boolean; member_id?: string; session_id?: string };
    if (result.cancelled && result.member_id && result.session_id) {
      const { member_id, session_id } = result;
      // 回應送出後再以 LINE 通知學員（代管成員通知其帳號持有人）
      after(() => notifyAdminCancel("booking", session_id, [member_id]));
    }
    return NextResponse.json({ ok: true, refunded: result.cancelled });
  }

  return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
}
