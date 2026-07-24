-- 真實格鬥預約系統 — 資料表結構
-- 在 Supabase SQL Editor 貼上執行（第 1 個跑）。

-- 會員（以 LINE userId 為辨識主鍵）
create table if not exists members (
  id           uuid primary key default gen_random_uuid(),
  line_user_id text unique not null,
  display_name text not null default '',
  phone        text,
  email        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 教練
create table if not exists coaches (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  avatar_url text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- 常規班範本（週二/三/五 這種每週固定的課）
create table if not exists class_templates (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  coach_id   uuid references coaches(id) on delete set null,
  weekday    int  not null check (weekday between 0 and 6), -- 0=日 .. 2=二 3=三 5=五 .. 6=六
  start_time time not null,
  end_time   time not null,
  capacity   int  not null check (capacity > 0),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- 實際課程場次（由範本每週產生；也可單場調整/停課）
create table if not exists class_sessions (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid references class_templates(id) on delete set null,
  coach_id     uuid references coaches(id) on delete set null,
  title        text not null,
  session_date date not null,
  start_time   time not null,
  end_time     time not null,
  capacity     int  not null check (capacity > 0),
  status       text not null default 'scheduled' check (status in ('scheduled','cancelled')),
  created_at   timestamptz not null default now()
);
-- 同一範本、同一天只會有一場（避免重複產生）
create unique index if not exists uniq_session_template_date
  on class_sessions(template_id, session_date) where template_id is not null;
create index if not exists idx_sessions_date on class_sessions(session_date);

-- 堂數錢包（後台手動儲值；一位會員可有多個，例如不同期別）
create table if not exists credit_wallets (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references members(id) on delete cascade,
  type             text not null default 'group' check (type in ('group','private')),
  total_credits    int  not null check (total_credits >= 0),
  remaining_credits int not null check (remaining_credits >= 0),
  valid_from       date not null default current_date,
  valid_to         date not null,
  note             text,
  created_at       timestamptz not null default now(),
  check (remaining_credits <= total_credits)
);
create index if not exists idx_wallets_member on credit_wallets(member_id);

-- 預約
create table if not exists bookings (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references members(id) on delete cascade,
  session_id   uuid not null references class_sessions(id) on delete cascade,
  wallet_id    uuid references credit_wallets(id) on delete set null,
  status       text not null default 'booked' check (status in ('booked','cancelled','attended','no_show')),
  credits_used int  not null default 1,
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz
);
-- 同一會員、同一場，同時間只能有一筆有效預約
create unique index if not exists uniq_active_booking
  on bookings(member_id, session_id) where status = 'booked';
create index if not exists idx_bookings_session on bookings(session_id);
create index if not exists idx_bookings_member  on bookings(member_id);

-- 後台管理員（綁 Supabase Auth 使用者）
create table if not exists admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'admin',
  created_at timestamptz not null default now()
);
