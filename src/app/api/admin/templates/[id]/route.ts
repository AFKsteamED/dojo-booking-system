import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";
import { relOne } from "@/lib/rel";

// 常態課範本詳情 + 參與名單（私人課用）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supa = getServiceSupabase();

  const { data: template } = await supa
    .from("class_templates")
    .select("*, coach:coaches(name)")
    .eq("id", id)
    .maybeSingle();
  if (!template) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const { data: rows } = await supa
    .from("template_members")
    .select("member:members(id, display_name, phone)")
    .eq("template_id", id);

  const members = (rows ?? []).map((r) =>
    relOne<{ id: string; display_name: string; phone: string | null }>(r.member)
  ).filter(Boolean);

  return NextResponse.json({
    template: { ...template, coach_name: relOne<{ name: string }>(template.coach)?.name ?? null },
    members,
  });
}

// 加入參與會員 body:{ member_id }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { member_id } = await req.json().catch(() => ({}));
  if (!member_id) return NextResponse.json({ error: "MISSING_MEMBER" }, { status: 400 });

  const supa = getServiceSupabase();
  const { error } = await supa
    .from("template_members")
    .upsert({ template_id: id, member_id }, { onConflict: "template_id,member_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// 移除參與會員 ?member_id=
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const memberId = new URL(req.url).searchParams.get("member_id");
  if (!memberId) return NextResponse.json({ error: "MISSING_MEMBER" }, { status: 400 });

  const supa = getServiceSupabase();
  const { error } = await supa
    .from("template_members")
    .delete()
    .eq("template_id", id)
    .eq("member_id", memberId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
