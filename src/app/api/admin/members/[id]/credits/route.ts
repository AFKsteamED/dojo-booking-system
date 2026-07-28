import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";
import { todayInTaipei } from "@/lib/date-utils";
import { pushText } from "@/lib/line-push";

// 幫會員加一張堂數錢包（手動儲值）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { type = "group", credits, valid_from, valid_to, note } = body;

  const n = Number(credits);
  if (!Number.isInteger(n) || n <= 0) {
    return NextResponse.json({ error: "INVALID_CREDITS" }, { status: 400 });
  }
  if (!valid_to) {
    return NextResponse.json({ error: "MISSING_VALID_TO" }, { status: 400 });
  }

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("credit_wallets")
    .insert({
      member_id: id,
      type,
      total_credits: n,
      remaining_credits: n,
      valid_from: valid_from || todayInTaipei(),
      valid_to,
      note: note || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 推播儲值成功給該會員（失敗不影響儲值）
  const { data: member } = await supa
    .from("members")
    .select("line_user_id")
    .eq("id", id)
    .maybeSingle();
  if (member?.line_user_id) {
    // 計算該類型目前可用總堂數
    const { data: wallets } = await supa
      .from("credit_wallets")
      .select("remaining_credits")
      .eq("member_id", id)
      .eq("type", type)
      .gte("valid_to", todayInTaipei());
    const totalRemaining = (wallets ?? []).reduce(
      (sum, w) => sum + (w.remaining_credits as number),
      0
    );
    const typeLabel = type === "private" ? "私人課程" : "團體課程";
    await pushText(
      member.line_user_id,
      `💳 堂數已儲值\n\n${typeLabel} ＋${n} 堂\n目前可用：${totalRemaining} 堂\n有效期至 ${valid_to}`
    );
  }

  return NextResponse.json({ wallet: data });
}
