import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";
import { isGender, isValidBirthday, isContactRelation, isMemberRelation } from "@/lib/profile";
import { isLocale } from "@/lib/i18n";

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

  // 家人關係：這位是小孩就找家長；是家長就找小孩清單
  let guardian: { id: string; display_name: string } | null = null;
  if (member.guardian_id) {
    const { data } = await supa
      .from("members")
      .select("id, display_name")
      .eq("id", member.guardian_id)
      .maybeSingle();
    guardian = data;
  }
  const { data: dependents } = await supa
    .from("members")
    .select("id, display_name, phone, relation")
    .eq("guardian_id", id);

  return NextResponse.json({
    member,
    wallets: wallets ?? [],
    bookings: bookings ?? [],
    guardian,
    dependents: dependents ?? [],
  });
}

// 後台修改會員基本資料（真實姓名、電話等鎖定欄位只有後台能改）
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
  if (typeof body.display_name === "string" && body.display_name.trim()) {
    update.display_name = body.display_name.trim();
  }
  if (typeof body.phone === "string") update.phone = body.phone.trim() || null;
  if (typeof body.email === "string") update.email = body.email.trim() || null;
  if ("gender" in body) {
    if (body.gender !== null && !isGender(body.gender)) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }
    update.gender = body.gender;
  }
  if ("birthday" in body) {
    if (body.birthday !== null && !isValidBirthday(body.birthday)) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }
    update.birthday = body.birthday;
  }
  if (typeof body.emergency_contact_name === "string") {
    update.emergency_contact_name = body.emergency_contact_name.trim() || null;
  }
  if (typeof body.emergency_contact_phone === "string") {
    update.emergency_contact_phone = body.emergency_contact_phone.trim() || null;
  }
  if ("emergency_contact_relation" in body) {
    if (body.emergency_contact_relation && !isContactRelation(body.emergency_contact_relation)) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }
    update.emergency_contact_relation = body.emergency_contact_relation || null;
  }
  if ("relation" in body) {
    if (body.relation && !isMemberRelation(body.relation)) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }
    update.relation = body.relation || null;
  }
  if ("locale" in body) {
    if (!isLocale(body.locale)) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    update.locale = body.locale;
  }

  const { data, error } = await supa
    .from("members")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}
