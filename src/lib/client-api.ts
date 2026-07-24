// 用戶端呼叫後端 API 的小工具（都在瀏覽器執行）
import type { Member, CreditWallet, SessionWithCounts } from "@/lib/types";

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error ?? "REQUEST_FAILED"), {
      code: data.error,
    });
  }
  return data;
}

export async function syncMember(lineUserId: string, displayName: string) {
  const res = await fetch("/api/members/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lineUserId, displayName }),
  });
  return jsonOrThrow(res) as Promise<{ member: Member; profileComplete: boolean }>;
}

export async function updateProfile(input: {
  lineUserId: string;
  display_name: string;
  phone: string;
  email: string;
}) {
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

export async function getSessionDetail(id: string, lineUserId: string) {
  const res = await fetch(`/api/sessions/${id}?lineUserId=${encodeURIComponent(lineUserId)}`);
  return jsonOrThrow(res) as Promise<{
    session: SessionWithCounts;
    roster: string[];
    myBooked: boolean;
    myCredits: number;
  }>;
}

export async function createBooking(lineUserId: string, sessionId: string) {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lineUserId, sessionId }),
  });
  return jsonOrThrow(res) as Promise<{ bookingId: string }>;
}

export async function cancelBooking(lineUserId: string, bookingId: string) {
  const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lineUserId }),
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

export async function getMyBookings(lineUserId: string, scope: "upcoming" | "past") {
  const res = await fetch(
    `/api/bookings?lineUserId=${encodeURIComponent(lineUserId)}&scope=${scope}`
  );
  const data = await jsonOrThrow(res);
  return data.bookings as MyBooking[];
}

export async function getCredits(lineUserId: string) {
  const res = await fetch(`/api/credits?lineUserId=${encodeURIComponent(lineUserId)}`);
  return jsonOrThrow(res) as Promise<{
    available: CreditWallet[];
    expired: CreditWallet[];
  }>;
}
