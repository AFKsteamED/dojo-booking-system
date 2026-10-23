import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";
import { relOne } from "@/lib/rel";

// 單一場次：資訊 + 完整預約名單（含會員姓名/電話、預約狀態）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supa = getServiceSupabase();

  const { data: session } = await supa
    .from("class_sessions")
    .select("*, coach:coaches(name)")
    .eq("id", id)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });

  const { data: bookings } = await supa
    .from("bookings")
    .select("id, status, created_at, member:members(display_name, phone, line_display_name, guardian_id, relation)")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  type M = {
    display_name: string;
    phone: string | null;
    line_display_name: string | null;
    guardian_id: string | null;
    relation: string | null;
  };
  const members = (bookings ?? []).map((b) => relOne<M>(b.member));

  // 代訂成員：一併帶出帳號持有人姓名，教練才知道是誰幫忙預約、要聯絡誰
  const guardianIds = [...new Set(members.map((m) => m?.guardian_id).filter((v): v is string => !!v))];
  const guardians: Record<string, { display_name: string; phone: string | null }> = {};
  if (guardianIds.length) {
    const { data: gs } = await supa.from("members").select("id, display_name, phone").in("id", guardianIds);
    for (const g of gs ?? []) guardians[g.id as string] = { display_name: g.display_name as string, phone: g.phone as string | null };
  }

  return NextResponse.json({
    session: {
      ...session,
      coach_name: relOne<{ name: string }>(session.coach)?.name ?? null,
    },
    bookings: (bookings ?? []).map((b, i) => {
      const m = members[i];
      const g = m?.guardian_id ? guardians[m.guardian_id] : undefined;
      return {
        id: b.id,
        status: b.status,
        display_name: m?.display_name ?? "會員",
        phone: m?.phone ?? g?.phone ?? null,
        line_display_name: m?.line_display_name ?? null,
        relation: m?.relation ?? null,
        guardian_name: g?.display_name ?? null,
      };
    }),
  });
}
