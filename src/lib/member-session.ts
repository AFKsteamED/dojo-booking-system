import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

// 會員登入 session：驗證過 LINE 身分後，用簽章 cookie 記住 lineUserId。
// 之後所有會員 API 都從這個 cookie 讀身分，不再信任前端傳來的 userId。

const COOKIE = "member_session";
const SECRET =
  process.env.MEMBER_SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET ?? "dev-secret";

function sign(userId: string): string {
  return createHmac("sha256", SECRET).update(userId).digest("hex");
}

/** 在 response 上設定會員 session cookie */
export function setMemberCookie(res: NextResponse, userId: string) {
  res.cookies.set(COOKIE, `${userId}|${sign(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 天
  });
}

/** 從 cookie 取出「已驗證」的 lineUserId（簽章不符回 null） */
export async function getSessionUserId(): Promise<string | null> {
  const c = await cookies();
  const raw = c.get(COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf("|");
  if (idx < 0) return null;
  const userId = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  const expected = sign(userId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length === b.length && timingSafeEqual(a, b)) return userId;
  return null;
}
