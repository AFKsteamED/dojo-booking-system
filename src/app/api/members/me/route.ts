import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionMember, isProfileComplete } from "@/lib/server-db";
import { isGender, isValidBirthday, str } from "@/lib/profile";

// 註冊後修改個人資料。
// - 真實姓名、電話：鎖定，不接受前端修改（只有後台能改）。
// - 性別、生日、緊急聯絡人、Email：可自行修改（必填欄位不可改成空白）。
export async function PATCH(req: NextRequest) {
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 401 });
  }
  if (!member.registered_at) {
    return NextResponse.json({ error: "PROFILE_INCOMPLETE" }, { status: 400 });
  }

  const b = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if ("email" in b) update.email = str(b.email) || null;
  if ("gender" in b) {
    if (!isGender(b.gender)) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    update.gender = b.gender;
  }
  if ("birthday" in b) {
    if (!isValidBirthday(b.birthday)) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    update.birthday = b.birthday;
  }
  if ("emergency_contact_name" in b) {
    const v = str(b.emergency_contact_name);
    if (!v) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    update.emergency_contact_name = v;
  }
  if ("emergency_contact_phone" in b) {
    const v = str(b.emergency_contact_phone);
    if (!v) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    update.emergency_contact_phone = v;
  }

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("members")
    .update(update)
    .eq("id", member.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    member: data,
    profileComplete: isProfileComplete(data),
  });
}
