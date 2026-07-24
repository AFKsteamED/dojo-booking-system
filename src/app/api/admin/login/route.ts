import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, expectedToken, ADMIN_COOKIE } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  if (!verifyPassword(password ?? "")) {
    return NextResponse.json({ error: "BAD_PASSWORD" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 天
  });
  return res;
}
