// 用戶端呼叫後端 API 的小工具（都在瀏覽器執行）
import type { Member, CreditWallet, SessionWithCounts } from "@/lib/types";

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.reason ? `${data.error}（${data.reason}）` : data.error ?? "REQUEST_FAILED";
    throw Object.assign(new Error(msg), { code: data.error });
  }
  return data;
}

// 進站同步：真身分帶 idToken；開發假身分帶 mock:true
export async function syncMember(input: { idToken: string | null }) {
  const res = await fetch("/api/members/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      input.idToken ? { idToken: input.idToken } : { mock: true }
    ),
  });
  return jsonOrThrow(res) as Promise<{ member: Member; profileComplete: boolean }>;
}

// 只送可編輯欄位（姓名鎖定 LINE、電話首次填後鎖定，都由後端把關）
export async function updateProfile(input: { phone: string; email: string }) {
  const res = await fetch("/api/members/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow(res) as Promise<{ member: Member; profileComplete: boolean }>;
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
    myBooked: boolean;
    myCredits: number;
  }>;
}

export async function createBooking(sessionId: string) {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  return jsonOrThrow(res) as Promise<{ bookingId: string }>;
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
};

export async function getMyBookings(scope: "upcoming" | "past") {
  const res = await fetch(`/api/bookings?scope=${scope}`);
  const data = await jsonOrThrow(res);
  return data.bookings as MyBooking[];
}

export async function getCredits() {
  const res = await fetch(`/api/credits`);
  return jsonOrThrow(res) as Promise<{
    available: CreditWallet[];
    expired: CreditWallet[];
  }>;
}
