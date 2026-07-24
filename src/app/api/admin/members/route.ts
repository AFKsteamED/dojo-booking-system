import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";

// 會員清單 / 搜尋（?q=姓名或電話）
export async function GET(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const q = new URL(req.url).searchParams.get("q")?.trim();
  const supa = getServiceSupabase();
  let query = supa
    .from("members")
    .select("id, display_name, phone, email, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (q) query = query.or(`display_name.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data });
}
