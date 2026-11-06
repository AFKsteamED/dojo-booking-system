import "server-only";
import { getServiceSupabase } from "@/lib/supabase";
import { relOne } from "@/lib/rel";
import { pushText } from "@/lib/line-push";
import { sessionBlock } from "@/lib/notify";
import { resolveNotifyTargets } from "@/lib/notify-targets";
import { t, type DictKey } from "@/lib/i18n";

// 教練在後台手動取消後，以 LINE 通知被退堂的學員（代管成員改通知帳號持有人，並註明是誰）。
//   "session"：整場停課      "booking"：強制取消單筆預約
const TEXT: Record<"session" | "booking", { title: DictKey; note: DictKey }> = {
  session: { title: "notify_insufficientTitle", note: "notify_manualCancelNote" }, // 標題同自動停課：「⚠️ 停課通知」
  booking: { title: "notify_adminCancelTitle", note: "notify_adminCancelNote" },
};

export async function notifyAdminCancel(kind: "session" | "booking", sessionId: string, memberIds: string[]) {
  if (memberIds.length === 0) return;
  try {
    const { data: s } = await getServiceSupabase()
      .from("class_sessions")
      .select("title, session_date, start_time, end_time, coach:coaches(name)")
      .eq("id", sessionId)
      .maybeSingle();
    if (!s) return;

    const { title, note } = TEXT[kind];
    for (const target of await resolveNotifyTargets(memberIds)) {
      const loc = target.locale;
      const block = sessionBlock(loc, {
        title: s.title as string,
        session_date: s.session_date as string,
        start_time: s.start_time as string,
        end_time: s.end_time as string,
        coach_name: relOne<{ name: string }>(s.coach)?.name ?? null,
      });
      const forSuffix = target.forName ? t(loc, "notify_for", { name: target.forName }) : "";
      await pushText(
        target.lineUserId,
        `${t(loc, title)}${forSuffix}\n\n${block}\n\n${t(loc, note)}\n${t(loc, "notify_askUs")}`
      );
    }
  } catch {
    // 通知失敗不影響取消結果（退堂已在資料庫完成）
  }
}
