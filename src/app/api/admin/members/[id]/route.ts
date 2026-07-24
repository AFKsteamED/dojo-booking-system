import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";

// 會員詳情：基本資料 + 堂數錢包 + 預約紀錄
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supa = getServiceSupabase();

  const { data: member } = await supa.from("members").select("*").eq("id", id).maybeSingle();
  if (!member) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });

  const { data: wallets } = await supa
    .from("credit_wallets")
    .select("*")
    .eq("member_id", id)
    .order("valid_to", { ascending: false });

  const { data: bookings } = await supa
    .from("bookings")
    .select("id, status, created_at, session:class_sessions(title, session_date, start_time)")
    .eq("member_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ member, wallets: wallets ?? [], bookings: bookings ?? [] });
}

// 後台修改會員基本資料（電話只有後台能改）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const supa = getServiceSupabase();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.phone === "string") update.phone = body.phone.trim() || null;
  if (typeof body.email === "string") update.email = body.email.trim() || null;

  const { data, error } = await supa
    .from("members")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}
