-- M7：公開/私人課程 + 參與資格名單（第 5 個跑；M2 那四支跑過後再跑這支）
-- 在 Supabase SQL Editor 貼上執行。可重複執行。

-- 1) 課程可見性：public 全部人可見 / private 只有名單內可見
alter table class_templates
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'private'));
alter table class_sessions
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'private'));

-- 2) 私人「常態課」的參與資格名單（範本層級；改一次影響之後每一週）
create table if not exists template_members (
  template_id uuid not null references class_templates(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (template_id, member_id)
);
create index if not exists idx_template_members_member on template_members(member_id);

-- 3) 私人「單堂課」的參與資格名單（場次層級；臨時加開用）
create table if not exists session_members (
  session_id uuid not null references class_sessions(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, member_id)
);
create index if not exists idx_session_members_member on session_members(member_id);

alter table template_members enable row level security;
alter table session_members enable row level security;

-- 4) 產生場次時，帶入範本的 visibility
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
      insert into class_sessions(template_id, coach_id, title, session_date, start_time, end_time, capacity, visibility)
      values (t.id, t.coach_id, t.title, d, t.start_time, t.end_time, t.capacity, t.visibility)
      on conflict (template_id, session_date) where template_id is not null do nothing;
      v_count := v_count + 1;
    end loop;
  end loop;
  return v_count;
end; $$;

-- 5) 預約：私人課要檢查資格，並扣對應類型的堂數（公開→group、私人→private）
--    新增錯誤碼：NOT_ELIGIBLE
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
  if (v_session.session_date + v_session.start_time) at time zone 'Asia/Taipei' < now() then
    raise exception 'SESSION_PAST';
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

-- 6) 公開常態課改名：格鬥團體課 → 散打團體課
update class_templates set title = '散打團體課' where title = '格鬥團體課';
update class_sessions  set title = '散打團體課' where title = '格鬥團體課';
