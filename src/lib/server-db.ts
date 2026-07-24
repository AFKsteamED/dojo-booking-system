import "server-only";
import { getServiceSupabase } from "@/lib/supabase";
import type { Member } from "@/lib/types";

// 伺服器端共用資料存取。
//
// ⚠️ 身分信任說明（v1）：
// 目前用戶端傳 lineUserId 過來，我們直接信任它。這在小型道館、低濫用風險下可接受，
// 但正式對外前（M6 強化）應改為：用戶端送 liff.getIDToken()，伺服器向 LINE 驗證後
// 取出真正的 userId。屆時只需改這一支檔案的取得身分邏輯即可。

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

/** 取得會員或建立（首次進站）。只在建立時寫入 LINE 暱稱，之後不覆蓋（讓個人檔案的姓名優先） */
export async function syncMember(input: {
  lineUserId: string;
  displayName?: string;
}): Promise<Member> {
  const supa = getServiceSupabase();
  const existing = await getMemberByLineId(input.lineUserId);
  if (existing) {
    await supa
      .from("members")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    return existing;
  }
  const { data, error } = await supa
    .from("members")
    .insert({
      line_user_id: input.lineUserId,
      display_name: input.displayName ?? "",
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
