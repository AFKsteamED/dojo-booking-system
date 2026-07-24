-- 真實格鬥預約系統 — 交易邏輯（第 2 個跑）
-- 這些函式保證「檢查名額 / 扣退堂數 / 建立預約」是單一交易，避免併發超賣。

-- 依常規班範本，產生未來 p_weeks 週的課程場次。可重複執行（已存在的略過）。
create or replace function generate_sessions(p_weeks int default 8)
returns int
language plpgsql
as $$
declare
  v_count int := 0;
  t class_templates%rowtype;
  d date;
begin
  for t in select * from class_templates where active loop
    for d in
      select gs::date
      from generate_series(current_date, current_date + (p_weeks * 7), interval '1 day') gs
      where extract(dow from gs) = t.weekday
    loop
      insert into class_sessions(template_id, coach_id, title, session_date, start_time, end_time, capacity)
      values (t.id, t.coach_id, t.title, d, t.start_time, t.end_time, t.capacity)
      on conflict (template_id, session_date) where template_id is not null do nothing;
      v_count := v_count + 1;
    end loop;
  end loop;
  return v_count;
end;
$$;

-- 預約一堂課：檢查場次/名額/堂數 → 建立預約 → 扣 1 堂。全在一個交易內。
-- 失敗時丟出可辨識的錯誤字串：SESSION_NOT_FOUND / SESSION_CANCELLED / SESSION_PAST /
--   FULL / NO_CREDITS / ALREADY_BOOKED
create or replace function book_session(p_member_id uuid, p_session_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_session   class_sessions%rowtype;
  v_booked    int;
  v_wallet_id uuid;
  v_booking_id uuid;
begin
  -- 鎖住該場次，讓同場的預約請求逐一處理（防超賣關鍵）
  select * into v_session from class_sessions where id = p_session_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_session.status <> 'scheduled' then raise exception 'SESSION_CANCELLED'; end if;
  if (v_session.session_date + v_session.start_time) at time zone 'Asia/Taipei' < now() then
    raise exception 'SESSION_PAST';
  end if;

  select count(*) into v_booked from bookings
    where session_id = p_session_id and status = 'booked';
  if v_booked >= v_session.capacity then raise exception 'FULL'; end if;

  -- 取一個可用堂數錢包：團體、剩餘>0、涵蓋上課日；優先用最快到期的
  select id into v_wallet_id from credit_wallets
    where member_id = p_member_id
      and type = 'group'
      and remaining_credits > 0
      and v_session.session_date between valid_from and valid_to
    order by valid_to asc
    limit 1
    for update;
  if v_wallet_id is null then raise exception 'NO_CREDITS'; end if;

  begin
    insert into bookings(member_id, session_id, wallet_id, status, credits_used)
    values (p_member_id, p_session_id, v_wallet_id, 'booked', 1)
    returning id into v_booking_id;
  exception when unique_violation then
    raise exception 'ALREADY_BOOKED';
  end;

  update credit_wallets set remaining_credits = remaining_credits - 1
    where id = v_wallet_id;

  return v_booking_id;
end;
$$;

-- 取消預約：開課前 p_cutoff_hours 小時（含）之後不可取消。可取消則退還 1 堂。
-- 錯誤字串：BOOKING_NOT_FOUND / NOT_YOURS / NOT_ACTIVE / TOO_LATE
create or replace function cancel_booking(
  p_member_id uuid,
  p_booking_id uuid,
  p_cutoff_hours int default 3
)
returns void
language plpgsql
as $$
declare
  v_booking bookings%rowtype;
  v_session class_sessions%rowtype;
  v_start   timestamptz;
begin
  select * into v_booking from bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_booking.member_id <> p_member_id then raise exception 'NOT_YOURS'; end if;
  if v_booking.status <> 'booked' then raise exception 'NOT_ACTIVE'; end if;

  select * into v_session from class_sessions where id = v_booking.session_id;
  v_start := (v_session.session_date + v_session.start_time) at time zone 'Asia/Taipei';
  if now() > v_start - make_interval(hours => p_cutoff_hours) then
    raise exception 'TOO_LATE';
  end if;

  update bookings set status = 'cancelled', cancelled_at = now() where id = p_booking_id;

  if v_booking.wallet_id is not null then
    update credit_wallets set remaining_credits = remaining_credits + 1
      where id = v_booking.wallet_id;
  end if;
end;
$$;
