import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";

// 編輯教練（改名 / 啟用停用）body:{ name?, active? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  if (typeof b.name === "string" && b.name.trim()) update.name = b.name.trim();
  if (typeof b.active === "boolean") update.active = b.active;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "NO_FIELDS" }, { status: 400 });
  }

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("coaches")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coach: data });
}
