import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";
import { relOne } from "@/lib/rel";

// 常態課範本清單（含可見性與私人課的參與人數）
export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("class_templates")
    .select("*, coach:coaches(name)")
    .eq("active", true)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 私人範本的參與人數
  const privateIds = (data ?? [])
    .filter((t) => t.visibility === "private")
    .map((t) => t.id as string);
  const counts: Record<string, number> = {};
  if (privateIds.length) {
    const { data: tm } = await supa
      .from("template_members")
      .select("template_id")
      .in("template_id", privateIds);
    for (const r of tm ?? []) {
      const id = r.template_id as string;
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }

  const templates = (data ?? []).map((t) => ({
    ...t,
    coach_name: relOne<{ name: string }>(t.coach)?.name ?? null,
    member_count: counts[t.id as string] ?? 0,
  }));
  return NextResponse.json({ templates });
}
