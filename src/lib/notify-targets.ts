import "server-only";
import { getServiceSupabase } from "@/lib/supabase";
import type { Locale } from "@/lib/i18n";

export type NotifyTarget = {
  memberId: string;
  lineUserId: string;
  locale: Locale;
  /** 通知對象不是本人（代管成員沒有 LINE，改通知帳號持有人）時，填入成員姓名 */
  forName: string | null;
};

/**
 * 依會員 id 找出「實際要收 LINE 通知的人」：
 * 有 LINE 的會員 → 本人；代管成員（沒有 LINE）→ 帳號持有人，並註明是哪位成員。
 * 語言一律依「收訊者」的設定。
 */
export async function resolveNotifyTargets(memberIds: string[]): Promise<NotifyTarget[]> {
  if (memberIds.length === 0) return [];
  const supa = getServiceSupabase();
  const { data: members } = await supa
    .from("members")
    .select("id, display_name, line_user_id, guardian_id, locale")
    .in("id", memberIds);

  const guardianIds = Array.from(
    new Set((members ?? []).map((m) => m.guardian_id as string | null).filter((x): x is string => !!x))
  );
  const guardians: Record<string, { line_user_id: string | null; locale: Locale }> = {};
  if (guardianIds.length) {
    const { data } = await supa.from("members").select("id, line_user_id, locale").in("id", guardianIds);
    for (const g of data ?? []) {
      guardians[g.id as string] = { line_user_id: g.line_user_id as string | null, locale: g.locale as Locale };
    }
  }

  const out: NotifyTarget[] = [];
  for (const m of members ?? []) {
    if (m.line_user_id) {
      out.push({ memberId: m.id as string, lineUserId: m.line_user_id as string, locale: m.locale as Locale, forName: null });
    } else if (m.guardian_id && guardians[m.guardian_id as string]?.line_user_id) {
      const g = guardians[m.guardian_id as string];
      out.push({
        memberId: m.id as string,
        lineUserId: g.line_user_id as string,
        locale: g.locale,
        forName: m.display_name as string,
      });
    }
  }
  return out;
}
