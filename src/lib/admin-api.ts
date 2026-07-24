// 後台前端呼叫工具
async function j(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? "FAILED"), { code: data.error });
  return data;
}

export const adminApi = {
  async logout() {
    await fetch("/api/admin/logout", { method: "POST" });
  },
  async members(q = "") {
    return j(await fetch(`/api/admin/members?q=${encodeURIComponent(q)}`));
  },
  async member(id: string) {
    return j(await fetch(`/api/admin/members/${id}`));
  },
  async addCredits(id: string, body: Record<string, unknown>) {
    return j(
      await fetch(`/api/admin/members/${id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    );
  },
  async templates() {
    return j(await fetch(`/api/admin/templates`));
  },
  async generateSessions(weeks: number) {
    return j(
      await fetch(`/api/admin/generate-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeks }),
      })
    );
  },
  async sessions(date: string) {
    return j(await fetch(`/api/admin/sessions?date=${date}`));
  },
  async session(id: string) {
    return j(await fetch(`/api/admin/sessions/${id}`));
  },
  async cancelSession(id: string) {
    return j(await fetch(`/api/admin/sessions/${id}/cancel`, { method: "POST" }));
  },
  async updateBooking(id: string, action: "attended" | "no_show" | "cancel") {
    return j(
      await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
    );
  },
};
