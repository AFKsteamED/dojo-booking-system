-- M8：學員真實資料註冊 + 家人代訂（小孩沒有 LINE）+ 語言偏好（中/英）
-- 在 Supabase SQL Editor 貼上執行（第 6 個跑，接在 05_private_classes.sql 之後）。可重複執行。
--
-- 觀念：LINE 只是「登入帳號」（證明是誰在操作）；學員的真實姓名、性別、生日等
--      由首次登入時的註冊頁填寫。一個 LINE 帳號底下可有多位學員（自己 + 小孩）。

-- 1) 語言偏好：存在會員資料上，換裝置/重開 App 都記得
alter table members
  add column if not exists locale text not null default 'zh' check (locale in ('zh', 'en'));

-- 2) 允許小孩沒有 LINE 帳號。
--    Postgres 的 UNIQUE 允許多筆 NULL，所以只需拿掉 NOT NULL，不用動 unique 限制。
alter table members
  alter column line_user_id drop not null;

-- 3) 家長/小孩關係：guardian_id 指向家長；一般會員為 null
alter table members
  add column if not exists guardian_id uuid references members(id) on delete set null;
create index if not exists idx_members_guardian on members(guardian_id);

-- 4) 真實資料欄位
alter table members add column if not exists line_display_name text;  -- LINE 暱稱（每次登入同步，給教練對照用）
alter table members add column if not exists gender text
  check (gender in ('male', 'female', 'undisclosed'));
alter table members add column if not exists birthday date;
alter table members add column if not exists emergency_contact_name text;
alter table members add column if not exists emergency_contact_phone text;
alter table members add column if not exists registered_at timestamptz; -- 完成註冊的時間（之後姓名鎖定）

-- 5) 既有會員：目前 display_name 其實是 LINE 暱稱，先複製一份到 line_display_name。
--    他們下次登入會被導到註冊頁填真實資料（填完才會覆蓋 display_name）。
update members
  set line_display_name = display_name
  where line_user_id is not null and line_display_name is null;
