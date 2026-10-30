// 後台前端呼叫工具
async function j(res: Response) {
  const data = await res.json().catch(() => ({}));
  // message：後端給的中文說明（有的話），可直接顯示給教練
  if (!res.ok) throw Object.assign(new Error(data.message ?? data.error ?? "FAILED"), { code: data.error });
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
  async updateMember(
    id: string,
    body: {
      display_name?: string;
      phone?: string;
      email?: string;
      gender?: string | null;
      birthday?: string | null;
      emergency_contact_name?: string;
      emergency_contact_phone?: string;
      emergency_contact_relation?: string | null;
      relation?: string | null;
      locale?: string;
    }
  ) {
    return j(
      await fetch(`/api/admin/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    );
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
  async updateWallet(
    id: string,
    body: { total_credits: number; remaining_credits: number; valid_from: string; valid_to: string; note: string }
  ) {
    return j(
      await fetch(`/api/admin/wallets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    );
  },
  async deleteWallet(id: string) {
    return j(await fetch(`/api/admin/wallets/${id}`, { method: "DELETE" }));
  },
  async templates() {
    return j(await fetch(`/api/admin/templates`));
  },
  async template(id: string) {
    return j(await fetch(`/api/admin/templates/${id}`));
  },
  async updateTemplate(id: string, body: Record<string, unknown>) {
    return j(
      await fetch(`/api/admin/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    );
  },
  async deactivateTemplate(id: string) {
    return j(
      await fetch(`/api/admin/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      })
    );
  },
  async addTemplateMember(id: string, member_id: string) {
    return j(
      await fetch(`/api/admin/templates/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id }),
      })
    );
  },
  async removeTemplateMember(id: string, member_id: string) {
    return j(
      await fetch(`/api/admin/templates/${id}?member_id=${member_id}`, { method: "DELETE" })
    );
  },
  async coaches() {
    return j(await fetch(`/api/admin/coaches`));
  },
  async coachesAll() {
    return j(await fetch(`/api/admin/coaches?all=1`));
  },
  async createCoach(name: string) {
    return j(
      await fetch(`/api/admin/coaches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
    );
  },
  async updateCoach(id: string, body: { name?: string; active?: boolean }) {
    return j(
      await fetch(`/api/admin/coaches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    );
  },
  async createCourse(body: Record<string, unknown>) {
    return j(
      await fetch(`/api/admin/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    );
  },
  async past(offset = 0, limit = 20) {
    return j(await fetch(`/api/admin/sessions/past?offset=${offset}&limit=${limit}`));
  },
  async upcoming(days = 7) {
    return j(await fetch(`/api/admin/sessions/upcoming?days=${days}`));
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
