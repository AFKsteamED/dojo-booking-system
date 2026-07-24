import "server-only";

// 向 LINE 驗證 ID Token 的真實性，取出「經 LINE 認證」的使用者身分。
// 文件：https://developers.line.biz/en/reference/line-login/#verify-id-token

export type VerifiedIdentity = {
  userId: string; // token 的 sub
  name: string; // LINE 顯示名稱（需 profile scope）
  picture?: string;
};

export type VerifyResult =
  | { ok: true; identity: VerifiedIdentity }
  | { ok: false; reason: string };

export async function verifyLineIdToken(idToken: string): Promise<VerifyResult> {
  // trim：避免環境變數貼上時夾帶空白/換行導致 client_id 不符
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim();
  if (!channelId) return { ok: false, reason: "NO_CHANNEL_ID" };

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    sub?: string;
    name?: string;
    picture?: string;
    aud?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      reason: `line_${res.status}:${data.error ?? ""}:${data.error_description ?? ""}`.slice(0, 180),
    };
  }
  if (!data.sub) return { ok: false, reason: "no_sub" };
  if (data.aud !== channelId) {
    return { ok: false, reason: `aud_mismatch(${data.aud} vs ${channelId})` };
  }
  return {
    ok: true,
    identity: { userId: data.sub, name: data.name ?? "", picture: data.picture },
  };
}
