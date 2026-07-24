import "server-only";

// 向 LINE 驗證 ID Token 的真實性，取出「經 LINE 認證」的使用者身分。
// 文件：https://developers.line.biz/en/reference/line-login/#verify-id-token

const CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID;

export type VerifiedIdentity = {
  userId: string; // token 的 sub
  name: string; // LINE 顯示名稱（需 profile scope）
  picture?: string;
};

export async function verifyLineIdToken(
  idToken: string
): Promise<VerifiedIdentity | null> {
  if (!CHANNEL_ID) {
    throw new Error("缺少環境變數 LINE_LOGIN_CHANNEL_ID（無法驗證 LINE 身分）");
  }
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: CHANNEL_ID }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    sub?: string;
    name?: string;
    picture?: string;
    aud?: string;
  };
  // LINE 驗證端已檢查 client_id，這裡再確認 aud 一致
  if (!data.sub || data.aud !== CHANNEL_ID) return null;
  return { userId: data.sub, name: data.name ?? "", picture: data.picture };
}
