import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionMember, isProfileComplete } from "@/lib/server-db";
import { isGender, isContactRelation, isValidBirthday, str } from "@/lib/profile";

// 首次註冊：填寫真實資料。完成後姓名鎖定（之後只有後台能改）。
// 必填：真實姓名、電話、性別、生日、緊急聯絡人（姓名＋電話＋關係）；Email 選填。
export async function POST(req: NextRequest) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 401 });
  if (member.registered_at) {
    return NextResponse.json({ error: "ALREADY_REGISTERED" }, { status: 409 });
  }

  const b = await req.json().catch(() => ({}));
  const displayName = str(b.display_name);
  // 電話若之前已填過（舊會員）就沿用，不允許趁註冊改掉
  const phone = member.phone?.trim() || str(b.phone);
  const ecName = str(b.emergency_contact_name);
  const ecPhone = str(b.emergency_contact_phone);

  if (
    !displayName ||
    !phone ||
    !ecName ||
    !ecPhone ||
    !isContactRelation(b.emergency_contact_relation) ||
    !isGender(b.gender) ||
    !isValidBirthday(b.birthday)
  ) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("members")
    .update({
      display_name: displayName,
      phone,
      gender: b.gender,
      birthday: b.birthday,
      emergency_contact_name: ecName,
      emergency_contact_phone: ecPhone,
      emergency_contact_relation: b.emergency_contact_relation,
      email: str(b.email) || null,
      registered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data, profileComplete: isProfileComplete(data) });
}
