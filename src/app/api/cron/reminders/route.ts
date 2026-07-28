import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { relOne } from "@/lib/rel";
import { pushTextMany } from "@/lib/line-push";
import { sessionBlock } from "@/lib/notify";
import { todayInTaipei, addDaysStr } from "@/lib/date-utils";

// 開課前一天提醒。由 Vercel Cron 每日呼叫（見 vercel.json）。
// 保護：需帶 Authorization: Bearer <CRON_SECRET>（Vercel Cron 會自動帶），
//       或本機測試用 ?secret=<CRON_SECRET>。
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const qs = new URL(req.url).searchParams.get("secret");
  if (secret && auth !== `Bearer ${secret}` && qs !== secret) {
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

  // 每個場次的訊息內容
  const blockById: Record<string, string> = {};
  for (const s of sessions ?? []) {
    blockById[s.id as string] = sessionBlock({
      title: s.title as string,
      session_date: s.session_date as string,
      start_time: s.start_time as string,
      end_time: s.end_time as string,
      coach_name: relOne<{ name: string }>(s.coach)?.name ?? null,
    });
  }

  const { data: bookings } = await supa
    .from("bookings")
    .select("session_id, member:members(line_user_id)")
    .eq("status", "booked")
    .in("session_id", ids);

  const items = (bookings ?? [])
    .map((b) => {
      const userId = relOne<{ line_user_id: string }>(b.member)?.line_user_id;
      const block = blockById[b.session_id as string];
      if (!userId || !block) return null;
      return { userId, text: `⏰ 明日課程提醒\n\n${block}\n\n期待見到你！` };
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
