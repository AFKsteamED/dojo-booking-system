-- 教練後台登入防暴力破解：同一個連線來源（IP）連續輸錯 3 次，鎖定 15 分鐘，並以 LINE 通知管理者。
--
-- 為什麼記在資料庫：網站函式會同時跑在多台伺服器上，記在記憶體裡會漏算。
-- 為什麼「先扣次數、再比對密碼」：避免有人一次同時送出大量請求，在鎖定生效前就試了很多組密碼。
-- 以 IP 為單位（不是全站一起鎖），惡意人士才無法故意輸錯來把所有教練都鎖在門外。
--
-- 手動解除所有鎖定（例如教練自己被鎖住又急著登入）：
--   delete from admin_login_guard;

create table if not exists admin_login_guard (
  ip           text primary key,
  attempts     int not null default 0,          -- 這一輪已嘗試的次數（登入成功即清除）
  window_start timestamptz not null default now(),
  locked_until timestamptz
);

alter table admin_login_guard enable row level security;  -- 與其他資料表相同：不設 policy，前端無法直接存取

-- 每次登入前呼叫：先佔用一次嘗試機會。
-- 回傳 ok=false 表示仍在鎖定中（這次不比對密碼）；
-- ok=true 時 tries 為這一輪第幾次，達上限時同時回傳 lock_until（這次仍會比對密碼）。
-- 與其他函式相同不設 security definer：以匿名身分呼叫會被 RLS 擋下，只有伺服器的 service role 能用。
create or replace function admin_login_attempt(p_ip text, p_max int default 3, p_lock_minutes int default 15)
returns table (ok boolean, tries int, lock_until timestamptz)
language plpgsql as $$
declare
  v admin_login_guard%rowtype;
  v_window interval := make_interval(mins => p_lock_minutes);
begin
  -- 順手清掉一天以前、沒有在鎖定中的紀錄
  delete from admin_login_guard g
   where g.window_start < now() - interval '1 day'
     and (g.locked_until is null or g.locked_until < now());

  insert into admin_login_guard (ip) values (p_ip) on conflict (ip) do nothing;
  select * into v from admin_login_guard g where g.ip = p_ip for update;

  if v.locked_until is not null and v.locked_until > now() then
    return query select false, v.attempts, v.locked_until;
    return;
  end if;

  -- 鎖定已過期，或距離這一輪第一次嘗試超過 15 分鐘 → 重新計算
  if v.locked_until is not null or v.window_start < now() - v_window then
    v.attempts := 0;
    v.window_start := now();
    v.locked_until := null;
  end if;

  v.attempts := v.attempts + 1;
  if v.attempts >= p_max then
    v.locked_until := now() + v_window;
  end if;

  update admin_login_guard g
     set attempts = v.attempts, window_start = v.window_start, locked_until = v.locked_until
   where g.ip = p_ip;

  return query select true, v.attempts, v.locked_until;
end; $$;

-- 鎖定警示紀錄：每次有來源被鎖定就記一筆（含推估位置與裝置），並以 LINE 通知管理者。
-- 為避免有人一直換 IP 洗版、用光 LINE 免費訊息額度，24 小時內最多通知 p_daily_max 則（超過仍會記錄）。
create table if not exists admin_login_alerts (
  id         bigserial primary key,
  ip         text not null,
  location   text,
  device     text,
  notified   boolean not null default false,
  created_at timestamptz not null default now()
);

alter table admin_login_alerts enable row level security;

-- 記錄一次鎖定，回傳這次是否要發 LINE 通知
create or replace function admin_login_record_alert(p_ip text, p_location text, p_device text, p_daily_max int default 5)
returns boolean
language plpgsql as $$
declare
  v_notify boolean;
begin
  perform pg_advisory_xact_lock(hashtext('admin_login_alerts'));  -- 同時多筆時依序判斷，不會超過上限
  select count(*) < p_daily_max into v_notify
    from admin_login_alerts
   where notified and created_at > now() - interval '1 day';
  insert into admin_login_alerts (ip, location, device, notified)
  values (p_ip, p_location, p_device, v_notify);
  return v_notify;
end; $$;

-- 查看目前的嘗試與鎖定狀態：
-- select * from admin_login_guard order by window_start desc;
-- 查看鎖定警示紀錄：
-- select * from admin_login_alerts order by created_at desc limit 20;
