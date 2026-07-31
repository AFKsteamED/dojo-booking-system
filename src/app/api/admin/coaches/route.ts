import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";

// 教練清單。預設只回啟用中的（新增課程選教練用）；?all=1 連停用的一起回（管理頁用）。
export async function GET(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const all = new URL(req.url).searchParams.get("all");
  const supa = getServiceSupabase();
  let query = supa.from("coaches").select("id, name, active").order("name", { ascending: true });
  if (!all) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coaches: data });
}

// 新增教練 body:{ name }
export async function POST(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { name } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: "MISSING_NAME" }, { status: 400 });

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("coaches")
    .insert({ name: name.trim() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coach: data });
}
