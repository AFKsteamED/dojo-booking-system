import "server-only";
import { getServiceSupabase } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/member-session";
import type { Member } from "@/lib/types";

// 伺服器端共用資料存取。
//
// 身分來源：會員身分一律來自「已驗證的 session cookie」（見 member-session.ts）。
// cookie 是在 /api/members/sync 用 LINE ID Token 驗證通過後才簽發，因此可信任。
//
// 家人代訂：小孩（受扶養人）沒有自己的 LINE，不能自己登入。家長登入後，
// 可以用 memberId 參數「代表」自己的小孩操作（預約/查詢），後端一律用
// getActingMember() 驗證該 memberId 真的是「自己」或「自己的小孩」才放行。

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

/** 依 id 取得會員 */
export async function getMemberById(id: string): Promise<Member | null> {
  const supa = getServiceSupabase();
  const { data } = await supa.from("members").select("*").eq("id", id).maybeSingle();
  return (data as Member) ?? null;
}

/** 取得目前登入（session cookie）的會員；未登入或找不到回 null */
export async function getSessionMember(): Promise<Member | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return getMemberByLineId(userId);
}

/**
 * 取得「實際操作對象」會員：沒給 targetId 時就是登入者自己；
 * 給了 targetId，必須是登入者自己或登入者的小孩，否則回 null（視為無權限）。
 */
export async function getActingMember(
  sessionMember: Member,
  targetId?: string | null
): Promise<Member | null> {
  if (!targetId || targetId === sessionMember.id) return sessionMember;
  const target = await getMemberById(targetId);
  if (!target) return null;
  if (target.guardian_id !== sessionMember.id) return null; // 不是自己的小孩
  return target;
}

/** 登入者的小孩清單（受扶養人） */
export async function getDependents(guardianId: string): Promise<Member[]> {
  const supa = getServiceSupabase();
  const { data } = await supa
    .from("members")
    .select("*")
    .eq("guardian_id", guardianId)
    .order("created_at", { ascending: true });
  return (data as Member[]) ?? [];
}

/**
 * 新增小孩（受扶養人）。沒有 LINE 帳號，資料由家長輸入；
 * 建立當下即視為已註冊（姓名鎖定，之後只有後台能改）。
 */
export async function createDependent(
  guardianId: string,
  input: {
    display_name: string;
    gender: string;
    birthday: string;
    phone?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
  }
): Promise<Member> {
  const supa = getServiceSupabase();
  const { data, error } = await supa
    .from("members")
    .insert({
      line_user_id: null,
      guardian_id: guardianId,
      display_name: input.display_name.trim(),
      gender: input.gender,
      birthday: input.birthday,
      phone: input.phone?.trim() || null,
      emergency_contact_name: input.emergency_contact_name?.trim() || null,
      emergency_contact_phone: input.emergency_contact_phone?.trim() || null,
      registered_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as Member;
}

/**
 * 取得會員或建立。LINE 暱稱（例：Apple）只存在 line_display_name 供教練對照；
 * 真實姓名 display_name 由學員自己在註冊頁填寫，登入同步不會覆蓋它。
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
        line_display_name: input.displayName,
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
      line_display_name: input.displayName,
      display_name: "", // 尚未註冊，等學員在註冊頁填真實姓名
    })
    .select()
    .single();
  if (error) throw error;
  return data as Member;
}

/**
 * 資料是否已填齊（可預約）。
 * 一般會員：已完成註冊，且姓名、電話、性別、生日、緊急聯絡人皆有值。
 * 小孩：姓名、性別、生日（電話與緊急聯絡人沿用家長）。
 */
export function isProfileComplete(m: Member | null): boolean {
  if (!m || !m.display_name?.trim() || !m.gender || !m.birthday) return false;
  if (m.guardian_id) return true;
  return !!(
    m.registered_at &&
    m.phone?.trim() &&
    m.emergency_contact_name?.trim() &&
    m.emergency_contact_phone?.trim()
  );
}

/** 某會員可參與的私人課集合（範本層級 + 單堂層級） */
export async function getEligibleSets(memberId?: string) {
  const empty = { templateIds: new Set<string>(), sessionIds: new Set<string>() };
  if (!memberId) return empty;
  const supa = getServiceSupabase();
  const [{ data: tm }, { data: sm }] = await Promise.all([
    supa.from("template_members").select("template_id").eq("member_id", memberId),
    supa.from("session_members").select("session_id").eq("member_id", memberId),
  ]);
  return {
    templateIds: new Set((tm ?? []).map((r) => r.template_id as string)),
    sessionIds: new Set((sm ?? []).map((r) => r.session_id as string)),
  };
}

/** 多個會員（本人+小孩）可參與的私人課聯集，供課表顯示用 */
export async function getEligibleSetsUnion(memberIds: string[]) {
  const sets = await Promise.all(memberIds.map((id) => getEligibleSets(id)));
  const templateIds = new Set<string>();
  const sessionIds = new Set<string>();
  for (const s of sets) {
    for (const t of s.templateIds) templateIds.add(t);
    for (const s2 of s.sessionIds) sessionIds.add(s2);
  }
  return { templateIds, sessionIds };
}

/** 這位會員能否看到/預約某私人場次 */
export function canSeePrivate(
  session: { visibility: string; template_id: string | null; id: string },
  eligible: { templateIds: Set<string>; sessionIds: Set<string> }
): boolean {
  if (session.visibility !== "private") return true;
  return (
    (!!session.template_id && eligible.templateIds.has(session.template_id)) ||
    eligible.sessionIds.has(session.id)
  );
}
