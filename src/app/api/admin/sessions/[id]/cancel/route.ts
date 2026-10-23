import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";

// 停課：把整場設為 cancelled，並退還所有已預約者的堂數
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supa = getServiceSupabase();

  // 找出這場所有有效預約，逐一退堂
  const { data: bookings } = await supa
    .from("bookings")
    .select("id, wallet_id")
    .eq("session_id", id)
    .eq("status", "booked");

  for (const b of bookings ?? []) {
    await supa
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", b.id);
    if (b.wallet_id) {
      // 退還 1 堂
      const { data: w } = await supa
        .from("credit_wallets")
        .select("remaining_credits")
        .eq("id", b.wallet_id)
        .single();
      if (w) {
        await supa
          .from("credit_wallets")
          .update({ remaining_credits: (w.remaining_credits as number) + 1 })
          .eq("id", b.wallet_id);
      }
    }
  }

  const { error } = await supa
    .from("class_sessions")
    .update({ status: "cancelled", cancel_reason: "manual", closed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, refunded: (bookings ?? []).length });
}
