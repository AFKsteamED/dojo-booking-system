import { NextRequest, NextResponse } from "next/server";
import { syncMember, isProfileComplete } from "@/lib/server-db";

// 進站時呼叫：確保會員存在，回傳會員資料與「檔案是否填齊」
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { lineUserId, displayName } = body;
  if (!lineUserId) {
    return NextResponse.json({ error: "MISSING_USER" }, { status: 400 });
  }
  const member = await syncMember({ lineUserId, displayName });
  return NextResponse.json({
    member,
    profileComplete: isProfileComplete(member),
  });
}
