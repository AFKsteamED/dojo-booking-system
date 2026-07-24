import "server-only";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/member-session";
import type { Member } from "@/lib/types";

// 伺服器端共用資料存取。
//
// 身分來源：會員身分一律來自「已驗證的 session cookie」（見 member-session.ts）。
// cookie 是在 /api/members/sync 用 LINE ID Token 驗證通過後才簽發，因此可信任。

/** 依 lineUserId 取得會員；沒有則回 null */
export async function getMemberByLineId(
  lineUserId: string
): Promise<Member | null> {
  const supa = getServiceSupabase();
  const { data } = await supa
    .from("members")
    .select("*")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  return (data as Member) ?? null;
}

/** 取得目前登入（session cookie）的會員；未登入或找不到回 null */
export async function getSessionMember(): Promise<Member | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return getMemberByLineId(userId);
}

/**
 * 取得會員或建立。姓名一律鎖定為 LINE 驗證後的顯示名稱（每次同步都更新），
 * 確保後端姓名資料的真實性，且會員端無法自行竄改。
 */
export async function syncMember(input: {
  lineUserId: string;
  displayName: string;
}): Promise<Member> {
  const supa = getServiceSupabase();
  const existing = await getMemberByLineId(input.lineUserId);
  if (existing) {
    const { data } = await supa
      .from("members")
      .update({
        display_name: input.displayName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    return (data as Member) ?? existing;
  }
  const { data, error } = await supa
    .from("members")
    .insert({
      line_user_id: input.lineUserId,
      display_name: input.displayName,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Member;
}

/** 個人檔案是否已填齊（姓名 + 電話） */
export function isProfileComplete(m: Member | null): boolean {
  return !!(m && m.display_name?.trim() && m.phone?.trim());
}
