-- 每天自動往後補足 8 週的常態課場次。
--
-- 原本只有在後台新增或修改常態課時才會產生場次（往後 8 週）；
-- 一段時間沒動常態課，課表就會在 8 週後變空。改由 Supabase pg_cron 每天補足。
-- 已存在的場次（包含已停課的）不會被重複產生或改動，可重複執行；停用的常態課不會再產生。
--
-- 同時修正：產生場次改以「台北日期」為起點。資料庫時區是 UTC，
-- 台北凌晨 0～8 點時 UTC 仍是前一天，原本可能多產生一堂已經過去的課。

create extension if not exists pg_cron;

-- 1) 產生場次：起點改為台北今天，其餘與 07 相同
create or replace function generate_sessions(p_weeks int default 8)
returns int language plpgsql as $$
declare
  v_count int := 0;
  v_today date := (now() at time zone 'Asia/Taipei')::date;
  t class_templates%rowtype;
  d date;
begin
  for t in select * from class_templates where active loop
    for d in
      select gs::date
      from generate_series(v_today, v_today + (p_weeks * 7), interval '1 day') gs
      where extract(dow from gs) = t.weekday
    loop
      insert into class_sessions(template_id, coach_id, title, session_date, start_time, end_time,
                                 capacity, visibility, min_attendance)
      values (t.id, t.coach_id, t.title, d, t.start_time, t.end_time,
              t.capacity, t.visibility, t.min_attendance)
      on conflict (template_id, session_date) where template_id is not null do nothing;
      v_count := v_count + 1;
    end loop;
  end loop;
  return v_count;
end; $$;

-- 2) 每天台北時間 03:00（UTC 19:00）執行；若之前排過同名工作先移除（可重複執行）
select cron.unschedule(jobid) from cron.job where jobname = 'extend-sessions';

select cron.schedule(
  'extend-sessions',
  '0 19 * * *',
  $$ select public.generate_sessions(8); $$
);

-- 3) 立即補一次（結果為檢查的場次數）
select public.generate_sessions(8);

-- 查看排程：select jobid, jobname, schedule from cron.job;
-- 最近執行紀錄：select status, return_message, start_time from cron.job_run_details
--               where jobid = (select jobid from cron.job where jobname = 'extend-sessions')
--               order by start_time desc limit 5;
