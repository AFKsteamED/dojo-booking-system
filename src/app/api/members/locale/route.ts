import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionMember } from "@/lib/server-db";
import { isLocale } from "@/lib/i18n";

// 切換語言偏好（存在會員資料上，跨裝置/重開 App 都記得）
export async function POST(req: NextRequest) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 401 });

  const { locale } = await req.json().catch(() => ({}));
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "INVALID_LOCALE" }, { status: 400 });
  }

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("members")
    .update({ locale })
    .eq("id", member.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}
