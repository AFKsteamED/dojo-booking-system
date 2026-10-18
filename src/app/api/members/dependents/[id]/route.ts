import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionMember, getMemberById } from "@/lib/server-db";
import { isGender, isValidBirthday, str } from "@/lib/profile";

// 編輯自己小孩的資料。只有該小孩的家長能改。
// 姓名建立後鎖定（只有後台能改）；性別、生日、電話、緊急聯絡人可改。
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 401 });

  const { id } = await params;
  const target = await getMemberById(id);
  if (!target || target.guardian_id !== member.id) {
    return NextResponse.json({ error: "NOT_YOUR_FAMILY" }, { status: 403 });
  }

  const b = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("gender" in b) {
    if (!isGender(b.gender)) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    update.gender = b.gender;
  }
  if ("birthday" in b) {
    if (!isValidBirthday(b.birthday)) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    update.birthday = b.birthday;
  }
  if ("phone" in b) update.phone = str(b.phone) || null;
  if ("emergency_contact_name" in b) update.emergency_contact_name = str(b.emergency_contact_name) || null;
  if ("emergency_contact_phone" in b) update.emergency_contact_phone = str(b.emergency_contact_phone) || null;

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("members")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dependent: data });
}
