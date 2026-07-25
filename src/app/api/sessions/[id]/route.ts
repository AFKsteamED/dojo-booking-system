import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionMember, getEligibleSets, canSeePrivate } from "@/lib/server-db";
import { relOne } from "@/lib/rel";

// 課程詳情：場次資訊 + 目前預約名單 + 我是否已預約 + 我的可用堂數
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supa = getServiceSupabase();
  const { data: session, error } = await supa
    .from("class_sessions")
    .select("*, coach:coaches(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });

  const member = await getSessionMember();

  // 私人課：非參與名單者不得查看
  if (session.visibility === "private") {
    const eligible = await getEligibleSets(member?.id);
    const ok = canSeePrivate(
      { visibility: "private", template_id: session.template_id as string | null, id: session.id as string },
      eligible
    );
    if (!ok) return NextResponse.json({ error: "NOT_ELIGIBLE" }, { status: 403 });
  }

  const walletType = session.visibility === "private" ? "private" : "group";

  // 名單（只取暱稱，保護隱私）
  const { data: roster } = await supa
    .from("bookings")
    .select("member:members(display_name)")
    .eq("session_id", id)
    .eq("status", "booked")
    .order("created_at", { ascending: true });

  const names = (roster ?? []).map(
    (r) => relOne<{ display_name: string }>(r.member)?.display_name ?? "會員"
  );

  // 我的狀態（可用堂數依課別：公開看團體堂數、私人看私人堂數）
  let myBooked = false;
  let myCredits = 0;
  if (member) {
    const { data: mine } = await supa
      .from("bookings")
      .select("id")
      .eq("session_id", id)
      .eq("member_id", member.id)
      .eq("status", "booked")
      .maybeSingle();
    myBooked = !!mine;

    const { data: wallets } = await supa
      .from("credit_wallets")
      .select("remaining_credits")
      .eq("member_id", member.id)
      .eq("type", walletType)
      .lte("valid_from", session.session_date)
      .gte("valid_to", session.session_date);
    myCredits = (wallets ?? []).reduce(
      (sum, w) => sum + (w.remaining_credits as number),
      0
    );
  }

  const booked = names.length;
  return NextResponse.json({
    session: {
      ...session,
      coach_name: relOne<{ name: string }>(session.coach)?.name ?? null,
      booked_count: booked,
      remaining: (session.capacity as number) - booked,
    },
    roster: names,
    myBooked,
    myCredits,
  });
}
