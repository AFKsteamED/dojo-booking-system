import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionMember, getMemberById } from "@/lib/server-db";
import { isGender, isMemberRelation, isContactRelation, isValidBirthday, str } from "@/lib/profile";

// 編輯自己代管成員的資料。只有該成員的帳號持有人能改。
// 姓名建立後鎖定（只有後台能改）；其餘欄位可改。
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
  const bad = () => NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("relation" in b) {
    if (!isMemberRelation(b.relation)) return bad();
    update.relation = b.relation;
  }
  if ("gender" in b) {
    if (!isGender(b.gender)) return bad();
    update.gender = b.gender;
  }
  if ("birthday" in b) {
    if (!isValidBirthday(b.birthday)) return bad();
    update.birthday = b.birthday;
  }
  if ("emergency_contact_relation" in b) {
    if (b.emergency_contact_relation && !isContactRelation(b.emergency_contact_relation)) return bad();
    update.emergency_contact_relation = b.emergency_contact_relation || null;
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
