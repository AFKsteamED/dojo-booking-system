// LIFF 身分工具
//
// 設計重點：
// - 正式環境（LINE 內開啟）：用真正的 LIFF SDK 取得使用者的 lineUserId。
// - 開發環境（電腦瀏覽器）：沒有設定 LIFF ID 時，自動回傳「假身分」，
//   讓你不用每次都進 LINE 也能開發、看畫面。
//
// 只要之後在 .env.local 設了 NEXT_PUBLIC_LIFF_ID，就會自動切換成真身分。

export type LiffProfile = {
  userId: string; // lineUserId — 全系統辨識會員的主鍵
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;
// 強制切換：'1' 一律用假身分、'0' 一律用真 LIFF；不設則自動判斷
const FORCE_MOCK = process.env.NEXT_PUBLIC_LIFF_MOCK;

// 開發用假身分（固定值，方便重複測試）
const MOCK_PROFILE: LiffProfile = {
  userId: "U_dev_mock_0001",
  displayName: "開發測試員",
  pictureUrl: undefined,
  statusMessage: "mock",
};

export type LiffState = {
  profile: LiffProfile;
  isMock: boolean;
  idToken: string | null; // 真身分時的 LINE ID Token（送給後端驗證）
};

/**
 * 判斷這次要不要用假身分。
 * 規則：沒設 LIFF ID、或在 localhost 開發時 → 用假身分（避免被導去 LINE 登入而中斷）。
 * 正式網址 / 在 LINE 內開啟 → 用真 LIFF。可用 NEXT_PUBLIC_LIFF_MOCK 手動覆寫。
 */
function shouldUseMock(): boolean {
  if (FORCE_MOCK === "1") return true;
  if (FORCE_MOCK === "0") return false;
  if (!LIFF_ID) return true;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
  }
  return false;
}

/**
 * 初始化 LIFF 並取得使用者身分。
 * 只在瀏覽器端呼叫（client component 的 effect 裡）。
 */
export async function initLiff(): Promise<LiffState> {
  // 開發模式（無 LIFF ID 或 localhost）→ 直接回假身分
  if (shouldUseMock() || !LIFF_ID) {
    return { profile: MOCK_PROFILE, isMock: true, idToken: null };
  }

  // 動態載入，避免在 server 端被打包
  const liff = (await import("@line/liff")).default;

  await liff.init({ liffId: LIFF_ID });

  // 尚未登入 → 導去 LINE 登入（登入後會導回原網址）
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
    // login() 會跳轉，這裡的 Promise 實際上不會 resolve
    return new Promise<LiffState>(() => {});
  }

  const p = await liff.getProfile();
  return {
    profile: {
      userId: p.userId,
      displayName: p.displayName,
      pictureUrl: p.pictureUrl,
      statusMessage: p.statusMessage,
    },
    isMock: false,
    idToken: liff.getIDToken(),
  };
}
