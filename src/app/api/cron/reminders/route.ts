import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { relOne } from "@/lib/rel";
import { pushTextMany } from "@/lib/line-push";
import { sessionBlock } from "@/lib/notify";
import { todayInTaipei, addDaysStr } from "@/lib/date-utils";
import { t, type Locale } from "@/lib/i18n";

type SessionInfo = {
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  coach_name: string | null;
};

// 開課前一天提醒。由 Vercel Cron 每日呼叫（見 vercel.json）。
// 保護：需帶 Authorization: Bearer <CRON_SECRET>（Vercel Cron 會自動帶），
//       或本機測試用 ?secret=<CRON_SECRET>。
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // 沒設定密鑰 → 一律拒絕（fail-closed），避免端點裸奔
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET_NOT_SET" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  const qs = new URL(req.url).searchParams.get("secret");
  if (auth !== `Bearer ${secret}` && qs !== secret) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const tomorrow = addDaysStr(todayInTaipei(), 1);
  const supa = getServiceSupabase();

  const { data: sessions } = await supa
    .from("class_sessions")
    .select("id, title, session_date, start_time, end_time, coach:coaches(name)")
    .eq("session_date", tomorrow)
    .eq("status", "scheduled");

  const ids = (sessions ?? []).map((s) => s.id as string);
  if (ids.length === 0) {
    return NextResponse.json({ date: tomorrow, sessions: 0, notified: 0 });
  }

  const infoById: Record<string, SessionInfo> = {};
  for (const s of sessions ?? []) {
    infoById[s.id as string] = {
      title: s.title as string,
      session_date: s.session_date as string,
      start_time: s.start_time as string,
      end_time: s.end_time as string,
      coach_name: relOne<{ name: string }>(s.coach)?.name ?? null,
    };
  }

  const { data: bookings } = await supa
    .from("bookings")
    .select("session_id, member:members(display_name, line_user_id, guardian_id, locale)")
    .eq("status", "booked")
    .in("session_id", ids);

  // 小孩沒有 LINE，通知改發給家長；需要查家長的 line_user_id/locale
  const guardianIds = Array.from(
    new Set(
      (bookings ?? [])
        .map((b) => relOne<{ guardian_id: string | null }>(b.member)?.guardian_id)
        .filter((x): x is string => !!x)
    )
  );
  const guardians: Record<string, { line_user_id: string | null; locale: Locale }> = {};
  if (guardianIds.length) {
    const { data: gRows } = await supa
      .from("members")
      .select("id, line_user_id, locale")
      .in("id", guardianIds);
    for (const g of gRows ?? []) {
      guardians[g.id as string] = {
        line_user_id: g.line_user_id as string | null,
        locale: (g.locale as Locale) ?? "zh",
      };
    }
  }

  const items = (bookings ?? [])
    .map((b) => {
      const m = relOne<{
        display_name: string;
        line_user_id: string | null;
        guardian_id: string | null;
        locale: Locale;
      }>(b.member);
      if (!m) return null;

      let userId = m.line_user_id;
      let locale: Locale = m.locale ?? "zh";
      let forSuffix = "";
      if (!userId && m.guardian_id) {
        const g = guardians[m.guardian_id];
        if (g?.line_user_id) {
          userId = g.line_user_id;
          locale = g.locale;
          forSuffix = t(locale, "notify_for", { name: m.display_name });
        }
      }
      const info = infoById[b.session_id as string];
      if (!userId || !info) return null;

      const block = sessionBlock(locale, info);
      const text = `${t(locale, "notify_reminder")}${forSuffix}\n\n${block}\n\n${t(locale, "notify_reminderNote")}`;
      return { userId, text };
    })
    .filter((x): x is { userId: string; text: string } => x !== null);

  const notified = await pushTextMany(items);
  return NextResponse.json({
    date: tomorrow,
    sessions: ids.length,
    bookings: items.length,
    notified,
  });
}
