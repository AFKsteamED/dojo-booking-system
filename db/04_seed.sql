-- 真實格鬥預約系統 — 種子資料（第 4 個跑）
-- ⚠️ 教練姓名、課名、人數上限請改成道館實際資料。

-- 教練（改成真實教練姓名）。用 NOT EXISTS 讓重複執行不會產生重複教練。
insert into coaches (name)
select '教練A' where not exists (select 1 from coaches where name = '教練A');
insert into coaches (name)
select '教練B' where not exists (select 1 from coaches where name = '教練B');

-- 常規班範本：週二 19:30–21:00 / 週三 19:00–20:30 / 週五 18:30–20:00
-- weekday: 2=週二 3=週三 5=週五。capacity 先設 12，可改。
insert into class_templates (title, coach_id, weekday, start_time, end_time, capacity)
select '格鬥團體課', (select id from coaches where name = '教練A' limit 1), 2, '19:30', '21:00', 12
where not exists (select 1 from class_templates where weekday = 2 and start_time = '19:30');

insert into class_templates (title, coach_id, weekday, start_time, end_time, capacity)
select '格鬥團體課', (select id from coaches where name = '教練A' limit 1), 3, '19:00', '20:30', 12
where not exists (select 1 from class_templates where weekday = 3 and start_time = '19:00');

insert into class_templates (title, coach_id, weekday, start_time, end_time, capacity)
select '格鬥團體課', (select id from coaches where name = '教練B' limit 1), 5, '18:30', '20:00', 12
where not exists (select 1 from class_templates where weekday = 5 and start_time = '18:30');

-- 產生未來 8 週的課程場次
select generate_sessions(8);

-- ── 開發測試資料（正式上線前可刪）──────────────────
-- 對應前端 localhost 假身分的 userId，讓本機能實際測預約流程
insert into members (line_user_id, display_name, phone, email)
values ('U_dev_mock_0001', '開發測試員', '0900000000', 'dev@example.com')
on conflict (line_user_id) do nothing;

-- 給這位測試會員一個 20 堂、半年有效的團體錢包
insert into credit_wallets (member_id, type, total_credits, remaining_credits, valid_from, valid_to, note)
select m.id, 'group', 20, 20, current_date, current_date + 180, '開發測試用'
from members m
where m.line_user_id = 'U_dev_mock_0001'
  and not exists (
    select 1 from credit_wallets w where w.member_id = m.id and w.note = '開發測試用'
  );
