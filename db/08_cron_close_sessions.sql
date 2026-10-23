-- 每 10 分鐘檢查一次「已到預約截止時間（開課前 3 小時）」的課程：
-- 人數足夠 → 照常開課；人數不足 → 自動停課、退堂、LINE 通知已預約的人。
--
-- 為什麼放在 Supabase：Vercel 免費方案的排程一天只能跑一次，無法準時在每堂課截止時處理。
-- Supabase 內建 pg_cron（排程）+ pg_net（發 HTTP 請求）可以每 10 分鐘呼叫一次網站。
--
-- ⚠️ 執行前把下面的 <CRON_SECRET> 換成 Vercel 環境變數裡的 CRON_SECRET 值。
--    （這個檔案進了 git，所以這裡不放真正的密鑰）
--
-- 若 create extension 出錯：到 Supabase Dashboard → Database → Extensions
-- 搜尋並開啟 pg_cron 與 pg_net，再執行下面的 cron.schedule 那段即可。

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- 若之前排過同名工作，先移除（可重複執行）
select cron.unschedule(jobid) from cron.job where jobname = 'close-sessions';

select cron.schedule(
  'close-sessions',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://dojo-booking-system.vercel.app/api/cron/close-sessions',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'),
    timeout_milliseconds := 30000
  );
  $$
);

-- 查看排程是否建立成功：
-- select jobid, jobname, schedule from cron.job;
-- 查看最近執行紀錄：
-- select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
