import { NextResponse } from "next/server";

// 診斷端點：只回報「環境變數是否存在」（布林值，不外洩任何實際值）。
// 用來確認正式站有沒有讀到必要的環境變數。
export async function GET() {
  const present = (v?: string) => !!v && v.trim().length > 0;
  return NextResponse.json({
    ok: true,
    env: {
      LINE_LOGIN_CHANNEL_ID: present(process.env.LINE_LOGIN_CHANNEL_ID),
      NEXT_PUBLIC_LIFF_ID: present(process.env.NEXT_PUBLIC_LIFF_ID),
      NEXT_PUBLIC_SUPABASE_URL: present(process.env.NEXT_PUBLIC_SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
      ADMIN_PASSWORD: present(process.env.ADMIN_PASSWORD),
      NODE_ENV: process.env.NODE_ENV,
    },
  });
}
