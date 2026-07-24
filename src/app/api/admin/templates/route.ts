import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";

// 常規班範本清單
export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("class_templates")
    .select("*, coach:coaches(name)")
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data });
}
