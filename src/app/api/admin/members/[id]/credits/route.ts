import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";
import { todayInTaipei } from "@/lib/date-utils";

// 幫會員加一張堂數錢包（手動儲值）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { type = "group", credits, valid_from, valid_to, note } = body;

  const n = Number(credits);
  if (!Number.isInteger(n) || n <= 0) {
    return NextResponse.json({ error: "INVALID_CREDITS" }, { status: 400 });
  }
  if (!valid_to) {
    return NextResponse.json({ error: "MISSING_VALID_TO" }, { status: 400 });
  }

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("credit_wallets")
    .insert({
      member_id: id,
      type,
      total_credits: n,
      remaining_credits: n,
      valid_from: valid_from || todayInTaipei(),
      valid_to,
      note: note || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ wallet: data });
}
