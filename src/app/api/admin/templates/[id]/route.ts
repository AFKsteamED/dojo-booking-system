import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";
import { relOne } from "@/lib/rel";
import { todayInTaipei } from "@/lib/date-utils";

// 取消某常態課「未來、無人預約」的場次並重新產生（供改星期/時間時對齊）
// 有人預約的未來場次則同步更新欄位，保留預約
async function propagateEdit(templateId: string, fields: Record<string, unknown>, weekdayChanged: boolean) {
  const supa = getServiceSupabase();
  const today = todayInTaipei();

  // 未來場次同步欄位（保留預約）
  const sessionFields: Record<string, unknown> = {};
  for (const k of ["title", "coach_id", "start_time", "end_time", "capacity"]) {
    if (k in fields) sessionFields[k] = fields[k];
  }
  if (Object.keys(sessionFields).length) {
    await supa
      .from("class_sessions")
      .update(sessionFields)
      .eq("template_id", templateId)
      .gte("session_date", today)
      .eq("status", "scheduled");
  }

  if (weekdayChanged) {
    // 刪掉未來、無人預約的舊場次，再重新產生到新星期
    const { data: future } = await supa
      .from("class_sessions")
      .select("id")
      .eq("template_id", templateId)
      .gte("session_date", today)
      .eq("status", "scheduled");
    for (const s of future ?? []) {
      const { count } = await supa
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("session_id", s.id)
        .eq("status", "booked");
      if (!count) await supa.from("class_sessions").delete().eq("id", s.id);
    }
    await supa.rpc("generate_sessions", { p_weeks: 8 });
  }
}

// 停用整個常態課：active=false，並取消未來場次、退還已預約的堂數
async function deactivateTemplate(templateId: string) {
  const supa = getServiceSupabase();
  const today = todayInTaipei();
  const { data: future } = await supa
    .from("class_sessions")
    .select("id")
    .eq("template_id", templateId)
    .gte("session_date", today)
    .eq("status", "scheduled");

  for (const s of future ?? []) {
    const { data: bks } = await supa
      .from("bookings")
      .select("id, wallet_id")
      .eq("session_id", s.id)
      .eq("status", "booked");
    for (const b of bks ?? []) {
      await supa
        .from("bookings")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", b.id);
      if (b.wallet_id) {
        const { data: w } = await supa
          .from("credit_wallets")
          .select("remaining_credits")
          .eq("id", b.wallet_id)
          .single();
        if (w) {
          await supa
            .from("credit_wallets")
            .update({ remaining_credits: (w.remaining_credits as number) + 1 })
            .eq("id", b.wallet_id);
        }
      }
    }
    await supa.from("class_sessions").update({ status: "cancelled" }).eq("id", s.id);
  }
  await supa.from("class_templates").update({ active: false }).eq("id", templateId);
}

// 編輯常態課欄位 / 停用。body 可含 title, coach_id, weekday, start_time, end_time, capacity, active
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const supa = getServiceSupabase();

  // 停用
  if (b.active === false) {
    await deactivateTemplate(id);
    return NextResponse.json({ ok: true, deactivated: true });
  }

  const { data: current } = await supa
    .from("class_templates")
    .select("weekday")
    .eq("id", id)
    .maybeSingle();
  if (!current) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const fields: Record<string, unknown> = {};
  if (typeof b.title === "string" && b.title.trim()) fields.title = b.title.trim();
  if ("coach_id" in b) fields.coach_id = b.coach_id || null;
  if (b.start_time) fields.start_time = b.start_time;
  if (b.end_time) fields.end_time = b.end_time;
  if (Number.isInteger(Number(b.capacity)) && Number(b.capacity) > 0) fields.capacity = Number(b.capacity);
  let weekdayChanged = false;
  if (Number.isInteger(Number(b.weekday)) && Number(b.weekday) >= 0 && Number(b.weekday) <= 6) {
    fields.weekday = Number(b.weekday);
    weekdayChanged = Number(b.weekday) !== (current.weekday as number);
  }
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "NO_FIELDS" }, { status: 400 });
  }

  const { error } = await supa.from("class_templates").update(fields).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await propagateEdit(id, fields, weekdayChanged);
  return NextResponse.json({ ok: true });
}

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
