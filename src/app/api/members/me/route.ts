import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionMember, isProfileComplete } from "@/lib/server-db";

// 更新個人檔案。
// - 姓名：鎖定為 LINE 名稱，不接受前端修改。
// - 電話：首次填一次；已有電話後就不可自行修改（只有後台能改）。
// - Email：可自由編輯。
export async function PATCH(req: NextRequest) {
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { phone, email } = body;

  const update: Record<string, unknown> = {
    email: (email ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  // 電話：僅在目前尚未設定時允許寫入（enter-once）
  const phoneClean = (phone ?? "").trim();
  if (!member.phone && phoneClean) {
    update.phone = phoneClean;
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
