import { NextRequest, NextResponse } from "next/server";
import { getSessionMember, createDependent } from "@/lib/server-db";
import { isGender, isValidBirthday, str } from "@/lib/profile";

// 新增小孩（受扶養人）。小孩沒有自己的 LINE，由家長填寫真實資料。
// 必填：姓名、性別、生日；電話與緊急聯絡人選填（沒填就以家長為聯絡人）。
export async function POST(req: NextRequest) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 401 });

  // 必須先完成自己的註冊，也不能讓小孩再掛小孩
  if (!member.registered_at) {
    return NextResponse.json({ error: "PROFILE_INCOMPLETE" }, { status: 400 });
  }
  if (member.guardian_id) {
    return NextResponse.json({ error: "CANNOT_ADD_DEPENDENT" }, { status: 400 });
  }

  const b = await req.json().catch(() => ({}));
  const displayName = str(b.display_name);
  if (!displayName || !isGender(b.gender) || !isValidBirthday(b.birthday)) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const dependent = await createDependent(member.id, {
    display_name: displayName,
    gender: b.gender,
    birthday: b.birthday,
    phone: str(b.phone) || null,
    emergency_contact_name: str(b.emergency_contact_name) || null,
    emergency_contact_phone: str(b.emergency_contact_phone) || null,
  });
  return NextResponse.json({ dependent });
}
