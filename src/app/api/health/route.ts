import { NextResponse } from "next/server";

// 暫時診斷端點：只回報環境變數是否存在（布林值，不外洩內容）。確認後即移除。
export async function GET() {
  const present = (v?: string) => !!v && v.trim().length > 0;
  return NextResponse.json({
    env: {
      LINE_CHANNEL_ACCESS_TOKEN: present(process.env.LINE_CHANNEL_ACCESS_TOKEN),
      CRON_SECRET: present(process.env.CRON_SECRET),
      LINE_LOGIN_CHANNEL_ID: present(process.env.LINE_LOGIN_CHANNEL_ID),
    },
  });
}
