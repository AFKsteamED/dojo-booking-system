import { NextRequest, NextResponse } from "next/server";
import { getSessionMember, createDependent } from "@/lib/server-db";
import { isGender, isMemberRelation, isContactRelation, isValidBirthday, str } from "@/lib/profile";

// 新增代訂成員（家人或朋友）。由帳號持有人填寫其真實資料。
// 必填：姓名、與帳號持有人的關係、性別、生日；電話與緊急聯絡人選填（未填則以帳號持有人為聯絡人）。
export async function POST(req: NextRequest) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 401 });

  // 必須先完成自己的註冊；代訂成員不能再代訂其他人
  if (!member.registered_at) {
    return NextResponse.json({ error: "PROFILE_INCOMPLETE" }, { status: 400 });
  }
  if (member.guardian_id) {
    return NextResponse.json({ error: "CANNOT_ADD_DEPENDENT" }, { status: 400 });
  }

  const b = await req.json().catch(() => ({}));
  const displayName = str(b.display_name);
  if (
    !displayName ||
    !isMemberRelation(b.relation) ||
    !isGender(b.gender) ||
    !isValidBirthday(b.birthday) ||
    (b.emergency_contact_relation && !isContactRelation(b.emergency_contact_relation))
  ) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const dependent = await createDependent(member.id, {
    display_name: displayName,
    relation: b.relation,
    gender: b.gender,
    birthday: b.birthday,
    phone: str(b.phone) || null,
    emergency_contact_name: str(b.emergency_contact_name) || null,
    emergency_contact_phone: str(b.emergency_contact_phone) || null,
    emergency_contact_relation: b.emergency_contact_relation || null,
  });
  return NextResponse.json({ dependent });
}
