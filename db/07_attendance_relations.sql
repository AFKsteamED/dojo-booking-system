-- M9：最低開班人數 + 預約截止（開課前 3 小時）+ 人數不足自動停課 + 關係欄位
-- 在 Supabase SQL Editor 貼上執行（第 7 個跑）。

-- 1) 關係欄位
--    緊急聯絡人與會員的關係：father / mother / spouse / child / sibling / friend / other
alter table members add column if not exists emergency_contact_relation text
  check (emergency_contact_relation in ('father','mother','spouse','child','sibling','friend','other'));
--    代訂成員與帳號持有人的關係：child / spouse / parent / sibling / friend / other
alter table members add column if not exists relation text
  check (relation in ('child','spouse','parent','sibling','friend','other'));
-- 既有的代訂成員（目前都是小孩）預設為「子女」
update members set relation = 'child' where guardian_id is not null and relation is null;

-- 2) 最低開班人數（預設 4 人；私人課/一對一預設 1 人）
alter table class_templates add column if not exists min_attendance int not null default 4
  check (min_attendance >= 1);
alter table class_sessions add column if not exists min_attendance int not null default 4
  check (min_attendance >= 1);
update class_templates set min_attendance = 1 where visibility = 'private' and min_attendance = 4;
update class_sessions  set min_attendance = 1 where visibility = 'private' and min_attendance = 4;

-- 3) 停課原因與截止處理紀錄
--    cancel_reason：manual（後台手動停課）/ insufficient（人數不足自動停課）
--    closed_at：系統已在截止時間處理過這堂課（避免重複處理）
alter table class_sessions add column if not exists cancel_reason text;
alter table class_sessions add column if not exists closed_at timestamptz;

-- 已經過了截止時間的舊課程一律標記為已處理，
-- 避免排程上線後把「已經上過的課」回頭判定停課、退堂、發通知。
update class_sessions
  set closed_at = now()
  where closed_at is null
    and (session_date + start_time) at time zone 'Asia/Taipei' - interval '3 hours' <= now();

-- 4) 產生場次時帶入最低開班人數
create or replace function generate_sessions(p_weeks int default 8)
returns int language plpgsql as $$
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

-- 5) 預約：開課前 3 小時截止（新錯誤碼 BOOKING_CLOSED），其餘規則同前
create or replace function book_session(p_member_id uuid, p_session_id uuid)
returns uuid language plpgsql as $$
declare
  v_session     class_sessions%rowtype;
  v_booked      int;
  v_wallet_id   uuid;
  v_booking_id  uuid;
  v_wallet_type text;
  v_eligible    boolean;
begin
  select * into v_session from class_sessions where id = p_session_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_session.status <> 'scheduled' then raise exception 'SESSION_CANCELLED'; end if;
  if (v_session.session_date + v_session.start_time) at time zone 'Asia/Taipei'
       - interval '3 hours' <= now() then
    raise exception 'BOOKING_CLOSED';
  end if;

  if v_session.visibility = 'private' then
    select (
      exists(select 1 from template_members tm
             where tm.template_id = v_session.template_id and tm.member_id = p_member_id)
      or exists(select 1 from session_members sm
             where sm.session_id = p_session_id and sm.member_id = p_member_id)
    ) into v_eligible;
    if not v_eligible then raise exception 'NOT_ELIGIBLE'; end if;
    v_wallet_type := 'private';
  else
    v_wallet_type := 'group';
  end if;

  select count(*) into v_booked from bookings
    where session_id = p_session_id and status = 'booked';
  if v_booked >= v_session.capacity then raise exception 'FULL'; end if;

  select id into v_wallet_id from credit_wallets
    where member_id = p_member_id
      and type = v_wallet_type
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

  update credit_wallets set remaining_credits = remaining_credits - 1 where id = v_wallet_id;
  return v_booking_id;
end; $$;

-- 6) 截止處理：到了開課前 3 小時，人數足夠就照常開課；不足就停課並全數退堂。
--    回傳 jsonb：{ cancelled: bool, booked: int, members: [被退堂的 member_id...] }
--    單一交易內完成，重複呼叫安全（已處理過的直接略過）。
create or replace function close_session(p_session_id uuid)
returns jsonb language plpgsql as $$
declare
  v_session  class_sessions%rowtype;
  v_start    timestamptz;
  v_booked   int;
  v_members  uuid[] := '{}';
  b          record;
begin
  select * into v_session from class_sessions where id = p_session_id for update;
  if not found or v_session.status <> 'scheduled' or v_session.closed_at is not null then
    return jsonb_build_object('skipped', true);
  end if;

  v_start := (v_session.session_date + v_session.start_time) at time zone 'Asia/Taipei';
  if v_start - interval '3 hours' > now() then
    return jsonb_build_object('skipped', true); -- 還沒到截止時間
  end if;

  -- 有效預約（含教練提早點名的出席/缺席）
  select count(*) into v_booked from bookings
    where session_id = p_session_id and status in ('booked','attended','no_show');

  -- 排程漏跑、課程已經開始：只標記已處理，不回頭停課
  if now() >= v_start or v_booked >= v_session.min_attendance then
    update class_sessions set closed_at = now() where id = p_session_id;
    return jsonb_build_object('cancelled', false, 'booked', v_booked);
  end if;

  for b in
    select id, member_id, wallet_id from bookings
    where session_id = p_session_id and status in ('booked','attended','no_show')
    for update
  loop
    update bookings set status = 'cancelled', cancelled_at = now() where id = b.id;
    if b.wallet_id is not null then
      update credit_wallets set remaining_credits = remaining_credits + 1 where id = b.wallet_id;
    end if;
    v_members := v_members || b.member_id;
  end loop;

  update class_sessions
    set status = 'cancelled', cancel_reason = 'insufficient', closed_at = now()
    where id = p_session_id;

  return jsonb_build_object('cancelled', true, 'booked', v_booked, 'members', to_jsonb(v_members));
end; $$;
