import { NextRequest, NextResponse } from "next/server";
import { syncMember, isProfileComplete } from "@/lib/server-db";
import { verifyLineIdToken } from "@/lib/line-verify";
import { setMemberCookie } from "@/lib/member-session";
import { localeFromLanguage } from "@/lib/i18n";

// 進站時呼叫：驗證 LINE 身分 → 確保會員存在 → 簽發 session cookie。
//
// - 正式（LINE 內）：帶 idToken，後端向 LINE 驗證，取出經認證的 userId + 姓名。
// - 開發（localhost 假身分）：帶 mock:true，僅在非正式環境允許。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { idToken, mock } = body;

  let identity: { userId: string; name: string } | null = null;

  if (idToken) {
    const result = await verifyLineIdToken(idToken);
    if (!result.ok) {
      return NextResponse.json(
        { error: "INVALID_ID_TOKEN", reason: result.reason },
        { status: 401 }
      );
    }
    identity = result.identity;
  } else if (mock && process.env.NODE_ENV !== "production") {
    identity = { userId: "U_dev_mock_0001", name: "開發測試員" };
  } else {
    return NextResponse.json({ error: "MISSING_IDENTITY" }, { status: 400 });
  }

  const member = await syncMember({
    lineUserId: identity.userId,
    displayName: identity.name,
    // 新會員依 LINE App 語言自動設定中/英（之後可在 App 右上角切換）
    locale: typeof body.lang === "string" ? localeFromLanguage(body.lang) : undefined,
  });

  const res = NextResponse.json({
    member,
    profileComplete: isProfileComplete(member),
  });
  setMemberCookie(res, identity.userId);
  return res;
}
