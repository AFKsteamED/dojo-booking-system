# 資料庫設定（M2）

在 Supabase 建立專案後，把這 4 支 SQL **依序**貼進 SQL Editor 執行。

## 步驟

1. 到 https://supabase.com 註冊 → New project（選離台灣近的區域，例：Singapore）。
   記下資料庫密碼。專案建好後：
   - **Project Settings → API** 取得：
     - `Project URL` → 填 `.env.local` 的 `NEXT_PUBLIC_SUPABASE_URL`
     - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`（保密！）
2. 左側 **SQL Editor** → New query，依序貼上並各自 Run：
   - `01_schema.sql`（資料表）
   - `02_functions.sql`（預約/取消/產生場次的交易邏輯）
   - `03_rls.sql`（安全鎖：預設拒絕前端直連）
   - `04_seed.sql`（教練、常規班、未來 8 週場次、開發測試會員+堂數）
3. 執行完在 **Table Editor** 應能看到 `class_sessions` 已有未來幾週的場次。

## 常用維護指令（在 SQL Editor 執行）

```sql
-- 之後要再往後補課表（例：再產生未來 12 週）
select generate_sessions(12);

-- 幫某會員加堂數（把 line_user_id 換成實際值）
insert into credit_wallets (member_id, type, total_credits, remaining_credits, valid_from, valid_to, note)
select id, 'group', 10, 10, current_date, current_date + 180, '2026-07 現金購買'
from members where line_user_id = 'Uxxxxxxxx';
```

## 正式上線前

刪掉 `04_seed.sql` 裡的「開發測試資料」（`U_dev_mock_0001` 會員與其錢包），
並把教練姓名、課名、人數上限改成道館實際資料。
