import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getMemberByLineId } from "@/lib/server-db";

// 我的堂數錢包（available 可使用 / expired 已失效）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lineUserId = searchParams.get("lineUserId");
  if (!lineUserId) return NextResponse.json({ error: "MISSING_USER" }, { status: 400 });

  const member = await getMemberByLineId(lineUserId);
  if (!member) return NextResponse.json({ available: [], expired: [] });

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("credit_wallets")
    .select("*")
    .eq("member_id", member.id)
    .order("valid_to", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  const available = (data ?? []).filter(
    (w) => (w.valid_to as string) >= today && (w.remaining_credits as number) > 0
  );
  const expired = (data ?? []).filter(
    (w) => !((w.valid_to as string) >= today && (w.remaining_credits as number) > 0)
  );

  return NextResponse.json({ available, expired });
}
