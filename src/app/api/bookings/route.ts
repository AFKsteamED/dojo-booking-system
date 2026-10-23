import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionMember, getActingMember, isProfileComplete } from "@/lib/server-db";
import { extractErrorCode } from "@/lib/booking-errors";
import { relOne } from "@/lib/rel";
import { pushText } from "@/lib/line-push";
import { sessionBlock } from "@/lib/notify";
import { messageForCode } from "@/lib/booking-errors";
import { t } from "@/lib/i18n";

// 取得某位家庭成員的預約清單（scope=upcoming 預約中 / past 已結束）
// ?memberId= 省略時看自己；可傳自己小孩的 id 查小孩的預約
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "upcoming";
  const memberIdParam = searchParams.get("memberId");

  const session = await getSessionMember();
  if (!session) return NextResponse.json({ bookings: [] });
  const member = await getActingMember(session, memberIdParam);
  if (!member) return NextResponse.json({ error: "NOT_YOUR_FAMILY" }, { status: 403 });

  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("bookings")
    .select("id, status, created_at, session:class_sessions(*, coach:coaches(name))")
    .eq("member_id", member.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const rows = (data ?? []).map((b) => {
    const s = relOne<{
      session_date: string;
      start_time: string;
      end_time: string;
      title: string;
      status: string;
      coach: { name: string } | null;
    }>(b.session);
    // 以台北時間組出開課時間
    const startMs = s
      ? new Date(`${s.session_date}T${s.start_time}+08:00`).getTime()
      : 0;
    return {
      id: b.id as string,
      status: b.status as string,
      title: s?.title ?? "",
      coach_name: relOne<{ name: string }>(s?.coach)?.name ?? null,
      session_date: s?.session_date ?? "",
      start_time: s?.start_time ?? "",
      end_time: s?.end_time ?? "",
      startMs,
      sessionCancelled: s?.status === "cancelled", // 停課（含人數不足自動停課）
    };
  });

  // upcoming = 仍為 booked 且尚未開課；past = 其餘（已取消 / 已過 / 已報到）
  const upcoming = rows
    .filter((r) => r.status === "booked" && r.startMs >= now)
    .sort((a, b) => a.startMs - b.startMs);
  const past = rows
    .filter((r) => !(r.status === "booked" && r.startMs >= now))
    .sort((a, b) => b.startMs - a.startMs);

  return NextResponse.json({ bookings: scope === "past" ? past : upcoming });
}

type PersonResult = { memberId: string; displayName: string; ok: boolean; error?: string };

// 建立預約。body: { sessionId, memberIds: string[] }（可同時幫自己+小孩預約同一堂課）
// 每人各自檢查資格、各自扣各自的堂數；未傳 memberIds 時預設只約自己（相容舊版）。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { sessionId } = body;
  const memberIds: string[] = Array.isArray(body.memberIds) && body.memberIds.length
    ? body.memberIds
    : body.memberId
      ? [body.memberId]
      : [];
  if (!sessionId) {
    return NextResponse.json({ error: "MISSING_USER" }, { status: 400 });
  }

  const session = await getSessionMember();
  if (!session) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 401 });

  const targets = memberIds.length ? memberIds : [session.id];
  const supa = getServiceSupabase();
  const locale = session.locale;

  const results: PersonResult[] = [];
  for (const targetId of targets) {
    const acting = await getActingMember(session, targetId);
    if (!acting) {
      results.push({ memberId: targetId, displayName: "?", ok: false, error: "NOT_YOUR_FAMILY" });
      continue;
    }
    if (!isProfileComplete(acting)) {
      results.push({ memberId: acting.id, displayName: acting.display_name, ok: false, error: "PROFILE_INCOMPLETE" });
      continue;
    }
    const { data, error } = await supa.rpc("book_session", {
      p_member_id: acting.id,
      p_session_id: sessionId,
    });
    if (error) {
      results.push({
        memberId: acting.id,
        displayName: acting.display_name,
        ok: false,
        error: extractErrorCode(error.message),
      });
    } else {
      results.push({ memberId: acting.id, displayName: acting.display_name, ok: true });
    }
  }

  const anyOk = results.some((r) => r.ok);

  // 推播（失敗不影響預約結果）：一次預約多人時合併成一則訊息
  if (anyOk) {
    const { data: sess } = await supa
      .from("class_sessions")
      .select("title, session_date, start_time, end_time, coach:coaches(name)")
      .eq("id", sessionId)
      .maybeSingle();
    if (sess) {
      const block = sessionBlock(locale, {
        title: sess.title as string,
        session_date: sess.session_date as string,
        start_time: sess.start_time as string,
        end_time: sess.end_time as string,
        coach_name: relOne<{ name: string }>(sess.coach)?.name ?? null,
      });
      const multi = results.length > 1;
      const lines = multi
        ? results.map(
            (r) => `${r.displayName}：${r.ok ? t(locale, "session_bookOk") : messageForCode(r.error ?? "UNKNOWN", locale)}`
          )
        : [];
      const title = t(locale, "notify_bookSuccess");
      const text = multi
        ? `${title}\n\n${block}\n\n${lines.join("\n")}\n\n${t(locale, "notify_cancelNote")}`
        : `${title}\n\n${block}\n\n${t(locale, "notify_cancelNote")}`;
      await pushText(session.line_user_id, text);
    }
  }

  // 一律回 200，結果細節都在 results 裡（每人各自成功/失敗原因），
  // 讓前端能完整顯示「自己成功、小孩堂數不足」這種混合結果，不靠 HTTP 狀態碼判斷。
  return NextResponse.json({ results });
}
