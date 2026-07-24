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
    .select("id, status, created_at, member:members(display_name, phone)")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    session: {
      ...session,
      coach_name: relOne<{ name: string }>(session.coach)?.name ?? null,
    },
    bookings: (bookings ?? []).map((b) => {
      const m = relOne<{ display_name: string; phone: string | null }>(b.member);
      return {
        id: b.id,
        status: b.status,
        display_name: m?.display_name ?? "會員",
        phone: m?.phone ?? null,
      };
    }),
  });
}
