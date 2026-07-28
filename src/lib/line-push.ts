import "server-only";

// LINE Messaging API 推播（push message）。
// 需要「Messaging API channel」的 access token（LINE_CHANNEL_ACCESS_TOKEN）。
//
// 注意：只有「已加入官方帳號好友」的使用者才收得到推播；未加好友會失敗。
// 所以這裡的失敗一律不拋錯、不中斷主流程（例如預約照樣成功）。

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

export async function pushText(userId: string, text: string): Promise<boolean> {
  if (!TOKEN || !userId) return false; // 未設定 token（開發）或無對象 → 略過
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ to: userId, messages: [{ type: "text", text }] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 推給多人（開課提醒用），回傳成功數
export async function pushTextMany(
  items: { userId: string; text: string }[]
): Promise<number> {
  let ok = 0;
  for (const it of items) {
    if (await pushText(it.userId, it.text)) ok++;
  }
  return ok;
}
