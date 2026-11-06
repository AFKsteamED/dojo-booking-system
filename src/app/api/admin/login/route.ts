import { NextRequest, NextResponse, after } from "next/server";
import { verifyPassword, expectedToken, ADMIN_COOKIE } from "@/lib/admin-auth";
import { getServiceSupabase } from "@/lib/supabase";
import { lockContext, alertLoginLocked } from "@/lib/login-alert";

// 防暴力破解：同一個連線來源連續輸錯 3 次，鎖定 15 分鐘並以 LINE 通知管理者（計數在資料庫，見 db/10）
const MAX_TRIES = 3;
const LOCK_MINUTES = 15;

// 連線來源 IP：Vercel 會覆寫這兩個標頭，用戶端無法偽造
function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function locked(until: string) {
  const seconds = Math.max(1, Math.ceil((new Date(until).getTime() - Date.now()) / 1000));
  return NextResponse.json(
    { error: "LOCKED", lockedUntil: until },
    { status: 429, headers: { "Retry-After": String(seconds) } }
  );
}

// 登入頁一打開就查：這個連線來源目前是否被鎖定
export async function GET(req: NextRequest) {
  const { data } = await getServiceSupabase()
    .from("admin_login_guard")
    .select("locked_until")
    .eq("ip", clientIp(req))
    .maybeSingle();
  const until = data?.locked_until as string | null | undefined;
  return NextResponse.json({ lockedUntil: until && new Date(until).getTime() > Date.now() ? until : null });
}

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  const ip = clientIp(req);
  const supa = getServiceSupabase();

  // 先佔用一次嘗試機會再比對密碼：就算同時送出大量請求，鎖定前也只會比對 3 次
  const { data, error } = await supa.rpc("admin_login_attempt", {
    p_ip: ip,
    p_max: MAX_TRIES,
    p_lock_minutes: LOCK_MINUTES,
  });
  const attempt = (data as { ok: boolean; tries: number; lock_until: string | null }[] | null)?.[0];
  // 無法確認嘗試次數時一律拒絕登入（fail-closed）
  if (error || !attempt) return NextResponse.json({ error: "LOGIN_UNAVAILABLE" }, { status: 503 });
  if (!attempt.ok) return locked(attempt.lock_until!);

  if (!verifyPassword(password ?? "")) {
    if (attempt.lock_until) {
      // 這次輸錯觸發鎖定：回應送出後再通知，不拖慢回應
      const ctx = lockContext(req, ip);
      after(() => alertLoginLocked(ctx, attempt.tries, LOCK_MINUTES));
      return locked(attempt.lock_until);
    }
    return NextResponse.json({ error: "BAD_PASSWORD", remaining: MAX_TRIES - attempt.tries }, { status: 401 });
  }

  // 登入成功：清除這個連線來源的嘗試紀錄
  await supa.from("admin_login_guard").delete().eq("ip", ip);

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
