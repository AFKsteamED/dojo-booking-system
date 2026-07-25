import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";

// 教練清單（新增課程時選教練用）
export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("coaches")
    .select("id, name")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coaches: data });
}
