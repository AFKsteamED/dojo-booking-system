// 用戶端呼叫後端 API 的小工具（都在瀏覽器執行）
import type { Member, CreditWallet, SessionWithCounts } from "@/lib/types";
import type { SessionPerson } from "@/app/api/sessions/[id]/route";

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.reason ? `${data.error}（${data.reason}）` : data.error ?? "REQUEST_FAILED";
    throw Object.assign(new Error(msg), { code: data.error });
  }
  return data;
}

// 進站同步：真身分帶 idToken；開發假身分帶 mock:true
export async function syncMember(input: { idToken: string | null; lang?: string | null }) {
  const res = await fetch("/api/members/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(input.idToken ? { idToken: input.idToken } : { mock: true }),
      lang: input.lang ?? undefined,
    }),
  });
  return jsonOrThrow(res) as Promise<{ member: Member; profileComplete: boolean }>;
}

export type RegisterInput = {
  display_name: string;
  phone: string;
  gender: string;
  birthday: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  email?: string;
};

// 首次註冊真實資料（完成後姓名鎖定）
export async function register(input: RegisterInput) {
  const res = await fetch("/api/members/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow(res) as Promise<{ member: Member; profileComplete: boolean }>;
}

// 註冊後可修改的欄位（姓名、電話鎖定，由後端把關）
export async function updateProfile(input: {
  gender?: string;
  birthday?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  email?: string;
}) {
  const res = await fetch("/api/members/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow(res) as Promise<{ member: Member; profileComplete: boolean }>;
}

export async function setLocale(locale: "zh" | "en") {
  const res = await fetch("/api/members/locale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
  });
  return jsonOrThrow(res) as Promise<{ member: Member }>;
}

// 家人（我自己 + 我的小孩）
export async function getHousehold() {
  const res = await fetch("/api/members/household");
  return jsonOrThrow(res) as Promise<{ self: Member; dependents: Member[] }>;
}

export type DependentInput = {
  display_name: string;
  relation: string;
  gender: string;
  birthday: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
};

export async function addDependent(input: DependentInput) {
  const res = await fetch("/api/members/dependents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow(res) as Promise<{ dependent: Member }>;
}

// 姓名建立後鎖定，這裡不能改
export async function updateDependent(id: string, input: Partial<Omit<DependentInput, "display_name">>) {
  const res = await fetch(`/api/members/dependents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow(res) as Promise<{ dependent: Member }>;
}

export async function getSessions(from: string, to: string) {
  const res = await fetch(`/api/sessions?from=${from}&to=${to}`);
  const data = await jsonOrThrow(res);
  return data.sessions as SessionWithCounts[];
}

export async function getSessionDetail(id: string) {
  const res = await fetch(`/api/sessions/${id}`);
  return jsonOrThrow(res) as Promise<{
    session: SessionWithCounts;
    roster: string[];
    people: SessionPerson[];
  }>;
}

export type BookResult = { memberId: string; displayName: string; ok: boolean; error?: string };

// 一次幫一人或多人（自己+小孩）預約同一堂課，各自扣各自的堂數
export async function createBookings(sessionId: string, memberIds: string[]) {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, memberIds }),
  });
  return jsonOrThrow(res) as Promise<{ results: BookResult[] }>;
}

export async function cancelBooking(bookingId: string) {
  const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return jsonOrThrow(res);
}

export type MyBooking = {
  id: string;
  status: string;
  title: string;
  coach_name: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  startMs: number;
  sessionCancelled: boolean;
};

export async function getMyBookings(scope: "upcoming" | "past", memberId?: string) {
  const qs = memberId ? `&memberId=${memberId}` : "";
  const res = await fetch(`/api/bookings?scope=${scope}${qs}`);
  const data = await jsonOrThrow(res);
  return data.bookings as MyBooking[];
}

export async function getCredits(memberId?: string) {
  const qs = memberId ? `?memberId=${memberId}` : "";
  const res = await fetch(`/api/credits${qs}`);
  return jsonOrThrow(res) as Promise<{
    available: CreditWallet[];
    expired: CreditWallet[];
  }>;
}
