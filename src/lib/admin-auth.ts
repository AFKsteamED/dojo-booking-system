import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// 教練後台的簡易登入：一組共用管理密碼 + httpOnly 簽章 cookie。
// 單一道館足夠；日後要多帳號可再換成 Supabase Auth。

export const ADMIN_COOKIE = "admin_session";
const PASSWORD = process.env.ADMIN_PASSWORD;
const SECRET = process.env.ADMIN_SESSION_SECRET ?? "dev-secret";

/** 由密碼與 secret 推出的登入權杖（放進 cookie） */
export function expectedToken(): string {
  return createHmac("sha256", SECRET).update(`admin:${PASSWORD ?? ""}`).digest("hex");
}

export function verifyPassword(pw: string): boolean {
  return !!PASSWORD && pw === PASSWORD;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** 目前請求是否為已登入的管理員 */
export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  const token = c.get(ADMIN_COOKIE)?.value;
  return !!token && !!PASSWORD && safeEqual(token, expectedToken());
}

/** 在 API 路由開頭呼叫；未登入回傳 401 response，已登入回傳 null */
export async function guardAdmin(): Promise<NextResponse | null> {
  if (await isAdmin()) return null;
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}
