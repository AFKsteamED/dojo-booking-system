import "server-only";
import type { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { pushText } from "@/lib/line-push";

// 後台登入因連續輸錯被鎖定時，記錄並以 LINE 通知管理者。
// 收件人是環境變數 ADMIN_ALERT_LINE_USER_ID（管理者的 LINE User ID，需已加官方帳號好友）。

// ISO 3166-2:TW 縣市代碼 → 中文名稱
const TW_REGION: Record<string, string> = {
  TPE: "臺北市", NWT: "新北市", TAO: "桃園市", TXG: "臺中市", TNN: "臺南市", KHH: "高雄市",
  KEE: "基隆市", HSZ: "新竹市", HSQ: "新竹縣", MIA: "苗栗縣", CHA: "彰化縣", NAN: "南投縣",
  YUN: "雲林縣", CYI: "嘉義市", CYQ: "嘉義縣", PIF: "屏東縣", ILA: "宜蘭縣", HUA: "花蓮縣",
  TTT: "臺東縣", PEN: "澎湖縣", KIN: "金門縣", LIE: "連江縣",
};

// 縣市代碼對不上時，改用英文城市名對照（Vercel 對台灣常只給城市名，例如 Hsinchu）
const TW_CITY: [string, string][] = [
  ["New Taipei", "新北市"], ["Banqiao", "新北市"], ["Xinzhuang", "新北市"], ["Zhonghe", "新北市"],
  ["Sanchong", "新北市"], ["Xindian", "新北市"], ["Taipei", "臺北市"], ["Taoyuan", "桃園市"],
  ["Zhongli", "桃園市"], ["Taichung", "臺中市"], ["Tainan", "臺南市"], ["Kaohsiung", "高雄市"],
  ["Keelung", "基隆市"], ["Zhubei", "新竹縣"], ["Hsinchu", "新竹"], ["Miaoli", "苗栗縣"],
  ["Changhua", "彰化縣"], ["Nantou", "南投縣"], ["Douliu", "雲林縣"], ["Yunlin", "雲林縣"],
  ["Chiayi", "嘉義"], ["Pingtung", "屏東縣"], ["Yilan", "宜蘭縣"], ["Luodong", "宜蘭縣"],
  ["Hualien", "花蓮縣"], ["Taitung", "臺東縣"], ["Magong", "澎湖縣"], ["Penghu", "澎湖縣"],
  ["Kinmen", "金門縣"], ["Matsu", "連江縣"], ["Nangan", "連江縣"],
];

export type LockContext = { ip: string; location: string; device: string };

// 依 Vercel 附上的 IP 地理標頭推估位置：只到縣市，手機網路與 VPN 可能不準
function approxLocation(req: NextRequest): string {
  const country = req.headers.get("x-vercel-ip-country");
  if (!country) return "無法判斷";
  const region = req.headers.get("x-vercel-ip-country-region") ?? "";
  let city = "";
  try {
    city = decodeURIComponent(req.headers.get("x-vercel-ip-city") ?? "");
  } catch {}
  const countryName = new Intl.DisplayNames(["zh-TW"], { type: "region" }).of(country) ?? country;
  const twCity = country === "TW" ? TW_CITY.find(([en]) => city.startsWith(en))?.[1] : undefined;
  const place = (country === "TW" && (TW_REGION[region] || twCity)) || city || region;
  return place ? `${place}，${countryName}` : countryName;
}

// 從 User-Agent 粗略判斷裝置與瀏覽器
function deviceOf(ua: string): string {
  const os = /iPhone/.test(ua) ? "iPhone"
    : /iPad/.test(ua) ? "iPad"
    : /Android/.test(ua) ? "Android"
    : /Mac OS X/.test(ua) ? "Mac"
    : /Windows/.test(ua) ? "Windows"
    : /Linux/.test(ua) ? "Linux"
    : null;
  const browser = / Line\//.test(ua) ? "LINE"
    : /Edg\//.test(ua) ? "Edge"
    : /(Chrome|CriOS)\//.test(ua) ? "Chrome"
    : /(Firefox|FxiOS)\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : null;
  if (!os && !browser) return ua ? "其他（可能是程式自動嘗試）" : "未知";
  return [os, browser].filter(Boolean).join("・");
}

// 在回應送出前讀取請求資訊（通知會在回應之後才發送）
export function lockContext(req: NextRequest, ip: string): LockContext {
  return { ip, location: approxLocation(req), device: deviceOf(req.headers.get("user-agent") ?? "") };
}

export async function alertLoginLocked(ctx: LockContext, tries: number, lockMinutes: number) {
  try {
    // 記錄這次鎖定；24 小時內通知已達上限時只記錄、不推播（避免被換 IP 洗版）
    const { data: notify } = await getServiceSupabase().rpc("admin_login_record_alert", {
      p_ip: ctx.ip,
      p_location: ctx.location,
      p_device: ctx.device,
    });
    if (!notify) return;
    const time = new Date().toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    await pushText(
      process.env.ADMIN_ALERT_LINE_USER_ID,
      [
        "⚠️ 後台登入警示",
        `有人連續輸錯 ${tries} 次管理密碼，該來源已鎖定 ${lockMinutes} 分鐘。`,
        `時間：${time}`,
        `位置（依 IP 推估）：${ctx.location}`,
        `IP：${ctx.ip}`,
        `裝置：${ctx.device}`,
        "若不是教練本人，建議更換管理密碼。",
      ].join("\n")
    );
  } catch {
    // 通知失敗不影響登入流程
  }
}
