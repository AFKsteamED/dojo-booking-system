import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionMember, getActingMember } from "@/lib/server-db";
import { todayInTaipei } from "@/lib/date-utils";

// 某位家庭成員的堂數錢包（available 可使用 / expired 已失效）
// ?memberId= 省略時看自己；可傳自己小孩的 id 查小孩的堂數
export async function GET(req: NextRequest) {
  const session = await getSessionMember();
  if (!session) return NextResponse.json({ available: [], expired: [] });

  const memberIdParam = new URL(req.url).searchParams.get("memberId");
  const member = await getActingMember(session, memberIdParam);
  if (!member) return NextResponse.json({ error: "NOT_YOUR_FAMILY" }, { status: 403 });

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("credit_wallets")
    .select("*")
    .eq("member_id", member.id)
    .order("valid_to", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const today = todayInTaipei();
  const available = (data ?? []).filter(
    (w) => (w.valid_to as string) >= today && (w.remaining_credits as number) > 0
  );
  const expired = (data ?? []).filter(
    (w) => !((w.valid_to as string) >= today && (w.remaining_credits as number) > 0)
  );

  return NextResponse.json({ available, expired });
}
