import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getMemberByLineId, isProfileComplete } from "@/lib/server-db";

// 更新個人檔案（姓名 / 電話 / Email）
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { lineUserId, display_name, phone, email } = body;
  if (!lineUserId) {
    return NextResponse.json({ error: "MISSING_USER" }, { status: 400 });
  }
  const member = await getMemberByLineId(lineUserId);
  if (!member) {
    return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });
  }

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("members")
    .update({
      display_name: (display_name ?? "").trim(),
      phone: (phone ?? "").trim() || null,
      email: (email ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    })
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
