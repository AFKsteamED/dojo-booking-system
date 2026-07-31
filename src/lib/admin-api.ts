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
  async updateMember(id: string, body: { phone?: string; email?: string }) {
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
  async upcoming(limit = 7) {
    return j(await fetch(`/api/admin/sessions/upcoming?limit=${limit}`));
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
