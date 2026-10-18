import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";
import { todayInTaipei } from "@/lib/date-utils";
import { pushText } from "@/lib/line-push";
import { t, type Locale } from "@/lib/i18n";

// 幫會員（或某會員的小孩）加一張堂數錢包（手動儲值）
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

  // 推播儲值成功（失敗不影響儲值）。
  // 小孩（受扶養人）沒有 LINE，改通知家長，並在訊息中註明是幫誰儲值。
  const { data: member } = await supa
    .from("members")
    .select("line_user_id, display_name, guardian_id, locale")
    .eq("id", id)
    .maybeSingle();

  if (member) {
    let notifyLineId = member.line_user_id as string | null;
    let notifyLocale = (member.locale as Locale) ?? "zh";
    let forSuffix = "";
    if (!notifyLineId && member.guardian_id) {
      const { data: guardian } = await supa
        .from("members")
        .select("line_user_id, locale")
        .eq("id", member.guardian_id)
        .maybeSingle();
      if (guardian?.line_user_id) {
        notifyLineId = guardian.line_user_id as string;
        notifyLocale = (guardian.locale as Locale) ?? "zh";
        forSuffix = t(notifyLocale, "notify_for", { name: member.display_name as string });
      }
    }

    if (notifyLineId) {
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
      const typeLabel = t(notifyLocale, type === "private" ? "notify_creditPrivate" : "notify_creditGroup");
      const text = [
        `${t(notifyLocale, "notify_creditTopUp")}${forSuffix}`,
        "",
        `${typeLabel} ${t(notifyLocale, "notify_creditAdded", { n })}`,
        t(notifyLocale, "notify_creditAvailable", { n: totalRemaining }),
        t(notifyLocale, "notify_creditValidUntil", { date: valid_to }),
      ].join("\n");
      await pushText(notifyLineId, text);
    }
  }

  return NextResponse.json({ wallet: data });
}
