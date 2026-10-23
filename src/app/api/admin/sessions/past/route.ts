import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { guardAdmin } from "@/lib/admin-auth";
import { relOne } from "@/lib/rel";
import { todayInTaipei } from "@/lib/date-utils";
import { sessionStartMs } from "@/lib/session-status";

// 後台：過去已開班的課程（未停課且至少一人預約），由新到舊，可分頁。
// 用法：/api/admin/sessions/past?offset=0&limit=20
export async function GET(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const sp = new URL(req.url).searchParams;
  const offset = Math.max(0, Number(sp.get("offset") ?? "0") || 0);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit") ?? "20") || 20));

  const supa = getServiceSupabase();
  // bookings!inner：只取「有預約（含已出席/未出席）」的場次
  const { data, error } = await supa
    .from("class_sessions")
    .select("*, coach:coaches(name), bookings!inner(status)")
    .eq("status", "scheduled")
    .in("bookings.status", ["booked", "attended", "no_show"])
    .lte("session_date", todayInTaipei())
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const rows = data ?? [];
  const sessions = rows
    // 今天還沒開始的課不算「過去」
    .filter((s) => sessionStartMs({ session_date: s.session_date as string, start_time: s.start_time as string }) <= now)
    .map((s) => {
      const bks = (s.bookings as { status: string }[]) ?? [];
      const { bookings: _omit, ...rest } = s;
      void _omit;
      return {
        ...rest,
        coach_name: relOne<{ name: string }>(s.coach)?.name ?? null,
        participant_count: bks.length,
        attended_count: bks.filter((b) => b.status === "attended").length,
        no_show_count: bks.filter((b) => b.status === "no_show").length,
      };
    });

  return NextResponse.json({ sessions, hasMore: rows.length === limit });
}
