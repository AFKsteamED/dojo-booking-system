import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";

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
    await supa
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id);
    // 若原本是有效預約，退還 1 堂
    if (booking.status === "booked" && booking.wallet_id) {
      const { data: w } = await supa
        .from("credit_wallets")
        .select("remaining_credits")
        .eq("id", booking.wallet_id)
        .single();
      if (w) {
        await supa
          .from("credit_wallets")
          .update({ remaining_credits: (w.remaining_credits as number) + 1 })
          .eq("id", booking.wallet_id);
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
}
