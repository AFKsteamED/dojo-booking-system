import { NextRequest, NextResponse, after } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";
import { extractErrorCode } from "@/lib/booking-errors";
import { notifyAdminCancel } from "@/lib/notify-cancel";

// 停課：整場設為 cancelled、退還所有已預約者的堂數（資料庫單一交易，見 db/11），再以 LINE 通知
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { data, error } = await getServiceSupabase().rpc("admin_cancel_session", { p_session_id: id });
  if (error) {
    const code = extractErrorCode(error.message);
    return NextResponse.json({ error: code }, { status: code === "SESSION_NOT_FOUND" ? 404 : 500 });
  }

  const result = data as { cancelled: boolean; members: string[] };
  const members = result.cancelled && Array.isArray(result.members) ? result.members : [];
  // 回應送出後再推播，教練按下停課不用等通知發完
  if (members.length) after(() => notifyAdminCancel("session", id, members));

  return NextResponse.json({ ok: true, refunded: members.length });
}
