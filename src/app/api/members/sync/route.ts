import { NextRequest, NextResponse } from "next/server";
import { syncMember, getMemberByLineId, getDependents, isProfileComplete } from "@/lib/server-db";
import { verifyLineIdToken } from "@/lib/line-verify";
import { setMemberCookie, getSessionUserId } from "@/lib/member-session";
import { localeFromLanguage } from "@/lib/i18n";
import type { Member } from "@/lib/types";

// 進站時呼叫：驗證 LINE 身分 → 確保會員存在 → 簽發 session cookie。
// 回傳會員資料＋代管成員，前端不必再另外查一次。
//
// - 正式（LINE 內）：帶 idToken，後端向 LINE 驗證，取出經認證的 userId + 姓名。
// - 回訪快速路徑：已有有效的 session cookie，且這次的 LINE 帳號（ID Token 的 sub）與 cookie 相同，
//   就不必再向 LINE 驗證——cookie 是之前驗證通過後才簽發的。此路徑不更新 LINE 暱稱、不延長 cookie，
//   所以最長 30 天會走一次完整驗證（並更新暱稱）。
// - 開發（localhost 假身分）：帶 mock:true，僅在非正式環境允許。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { idToken, mock } = body;

  if (idToken) {
    const cookieUserId = await getSessionUserId();
    if (cookieUserId && tokenSubject(idToken) === cookieUserId) {
      const member = await getMemberByLineId(cookieUserId);
      if (member) return respond(member);
    }
  }

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

  const res = await respond(member);
  setMemberCookie(res, identity.userId);
  return res;
}

async function respond(member: Member) {
  const dependents = member.guardian_id ? [] : await getDependents(member.id);
  return NextResponse.json({
    member,
    profileComplete: isProfileComplete(member),
    dependents,
  });
}

// 只取出 ID Token 的 sub（不驗簽）——僅用來比對是否與「已驗證的 cookie」為同一人，
// 不作為身分依據；不同或解不出來就走完整驗證。
function tokenSubject(idToken: unknown): string | null {
  if (typeof idToken !== "string") return null;
  const payload = idToken.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}
