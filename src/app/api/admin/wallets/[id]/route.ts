import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// 修改一筆堂數錢包：總堂數、剩餘堂數、有效期間、備註。
// 規則：
// - 0 ≤ 剩餘 ≤ 總堂數；有效起 ≤ 有效迄
// - 剩餘 + 尚未上課的預約（之後取消會退回這筆）≤ 總堂數，
//   否則日後學員取消預約、退回 1 堂時會超過總數而失敗
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const supa = getServiceSupabase();

  const { data: wallet } = await supa.from("credit_wallets").select("*").eq("id", id).maybeSingle();
  if (!wallet) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const total = "total_credits" in b ? Number(b.total_credits) : (wallet.total_credits as number);
  const remaining = "remaining_credits" in b ? Number(b.remaining_credits) : (wallet.remaining_credits as number);
  const validFrom = "valid_from" in b ? String(b.valid_from) : (wallet.valid_from as string);
  const validTo = "valid_to" in b ? String(b.valid_to) : (wallet.valid_to as string);

  if (!Number.isInteger(total) || !Number.isInteger(remaining) || total < 0 || remaining < 0) {
    return NextResponse.json({ error: "INVALID_CREDITS", message: "堂數需為 0 以上的整數" }, { status: 400 });
  }
  if (remaining > total) {
    return NextResponse.json({ error: "REMAINING_EXCEEDS_TOTAL", message: "剩餘堂數不可大於總堂數" }, { status: 400 });
  }
  if (!DATE.test(validFrom) || !DATE.test(validTo) || validFrom > validTo) {
    return NextResponse.json({ error: "INVALID_DATES", message: "有效期間不正確（起日需早於或等於迄日）" }, { status: 400 });
  }

  const { count: pending } = await supa
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("wallet_id", id)
    .eq("status", "booked");
  if (remaining + (pending ?? 0) > total) {
    return NextResponse.json(
      {
        error: "PENDING_EXCEEDS_TOTAL",
        message: `這筆堂數還有 ${pending} 堂尚未上課的預約（取消時會退回），剩餘＋${pending} 不可大於總堂數`,
      },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {
    total_credits: total,
    remaining_credits: remaining,
    valid_from: validFrom,
    valid_to: validTo,
  };
  if ("note" in b) update.note = typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;

  const { data, error } = await supa.from("credit_wallets").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: "UPDATE_FAILED", message: error.message }, { status: 500 });
  return NextResponse.json({ wallet: data });
}

// 刪除一筆堂數錢包：只限「從未被任何預約使用過」的（例如建錯的）。
// 已被使用過的不能刪，否則那些預約日後取消時無處退堂；請改用修改把剩餘歸零或縮短期限。
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supa = getServiceSupabase();
  const { count } = await supa
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("wallet_id", id);
  if (count) {
    return NextResponse.json(
      {
        error: "WALLET_IN_USE",
        message: `這筆堂數已有 ${count} 筆預約紀錄使用過，無法刪除。若要作廢，請把剩餘堂數改為 0 或縮短有效期限。`,
      },
      { status: 409 }
    );
  }

  const { error } = await supa.from("credit_wallets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "DELETE_FAILED", message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
