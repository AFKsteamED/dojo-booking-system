import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";

// 會員清單 / 搜尋（?q=真實姓名、LINE 暱稱或電話）
// 教練在官方帳號聊天室看到「Apple」，搜 Apple 就能找到本名。
export async function GET(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  // 移除會干擾 PostgREST 篩選語法的字元
  const q = new URL(req.url).searchParams.get("q")?.replace(/[,()*%]/g, "").trim();
  const supa = getServiceSupabase();
  let query = supa
    .from("members")
    .select("id, display_name, line_display_name, phone, email, guardian_id, relation, registered_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (q) {
    query = query.or(
      `display_name.ilike.%${q}%,line_display_name.ilike.%${q}%,phone.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data });
}
