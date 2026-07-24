import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 伺服器端 Supabase 連線（使用 service_role 金鑰）。
//
// ⚠️ 只能在伺服器端（Route Handlers / Server Components / Server Actions）import。
// service_role 會繞過 RLS、擁有完整權限，絕不可讓它進到瀏覽器。
// 檔案頂端的 "server-only" 會在有人不小心從 client component 引用時直接編譯報錯。
//
// 型別說明：這裡用寬鬆型別（any schema），不需跑 supabase 型別產生器就能通過 build；
// 我們在 src/lib/types.ts 手動維護領域型別供頁面使用。

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient<any, any, any> | null = null;

export function getServiceSupabase(): SupabaseClient<any, any, any> {
  if (!url || !serviceKey) {
    throw new Error(
      "缺少 Supabase 環境變數：請在 .env.local 設定 NEXT_PUBLIC_SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  if (!cached) {
    cached = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
