import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import {
  getSessionMember,
  getDependents,
  getEligibleSets,
  canSeePrivate,
  isProfileComplete,
} from "@/lib/server-db";
import type { Member } from "@/lib/types";
import { relOne } from "@/lib/rel";
import { maskName } from "@/lib/mask";

export type SessionPerson = {
  memberId: string;
  displayName: string;
  relation: "self" | "child";
  alreadyBooked: boolean;
  bookingId: string | null;
  eligible: boolean; // 私人課：是否在參與名單（公開課一律 true）
  profileComplete: boolean;
  credits: number;
};

// 課程詳情：場次資訊 + 目前預約名單 + 「我 + 我的小孩」各自的預約狀態
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
  const dependents = member ? await getDependents(member.id) : [];
  const household: Member[] = member ? [member, ...dependents] : [];

  const eligibleSets = await Promise.all(household.map((m) => getEligibleSets(m.id)));
  const eligibleFlags = household.map((_m, i) =>
    canSeePrivate(
      { visibility: session.visibility as string, template_id: session.template_id as string | null, id: session.id as string },
      eligibleSets[i]
    )
  );

  // 私人課：整個家庭都沒人有資格才擋（有資格的人仍看得到、也才能勾選預約）
  if (session.visibility === "private" && !eligibleFlags.some(Boolean)) {
    return NextResponse.json({ error: "NOT_ELIGIBLE" }, { status: 403 });
  }

  const walletType = session.visibility === "private" ? "private" : "group";

  // 名單（只取暱稱，遮罩保護隱私；後台看名單不受影響）
  const { data: roster } = await supa
    .from("bookings")
    .select("member:members(display_name)")
    .eq("session_id", id)
    .eq("status", "booked")
    .order("created_at", { ascending: true });
  const names = (roster ?? []).map((r) =>
    maskName(relOne<{ display_name: string }>(r.member)?.display_name ?? "會員")
  );

  // 家庭每位成員各自的預約狀態（本人 + 每個小孩）
  const people: SessionPerson[] = await Promise.all(
    household.map(async (m, i) => {
      const [{ data: mine }, { data: wallets }] = await Promise.all([
        supa
          .from("bookings")
          .select("id")
          .eq("session_id", id)
          .eq("member_id", m.id)
          .eq("status", "booked")
          .maybeSingle(),
        supa
          .from("credit_wallets")
          .select("remaining_credits")
          .eq("member_id", m.id)
          .eq("type", walletType)
          .lte("valid_from", session.session_date)
          .gte("valid_to", session.session_date),
      ]);
      const credits = (wallets ?? []).reduce(
        (sum, w) => sum + (w.remaining_credits as number),
        0
      );
      return {
        memberId: m.id,
        displayName: m.display_name,
        relation: m.guardian_id ? "child" : "self",
        alreadyBooked: !!mine,
        bookingId: mine?.id ?? null,
        eligible: eligibleFlags[i],
        profileComplete: isProfileComplete(m),
        credits,
      };
    })
  );

  const booked = names.length;
  return NextResponse.json({
    session: {
      ...session,
      coach_name: relOne<{ name: string }>(session.coach)?.name ?? null,
      booked_count: booked,
      remaining: (session.capacity as number) - booked,
    },
    roster: names,
    people,
  });
}
