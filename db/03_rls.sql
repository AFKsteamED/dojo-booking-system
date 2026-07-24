-- 真實格鬥預約系統 — Row Level Security（第 3 個跑）
--
-- 安全策略：所有資料存取都經過我們的 Next.js 伺服器（Route Handlers），
-- 伺服器用 service_role 金鑰連線（會「繞過」RLS）。
-- 因此這裡對前端匿名/一般登入者一律「預設拒絕」——不開任何 policy，
-- 確保就算有人拿到 anon key 也讀不到任何資料。
--
-- （service_role 金鑰只放在伺服器環境變數，永遠不會出現在瀏覽器。）

alter table members        enable row level security;
alter table coaches        enable row level security;
alter table class_templates enable row level security;
alter table class_sessions enable row level security;
alter table credit_wallets enable row level security;
alter table bookings       enable row level security;
alter table admins         enable row level security;

-- 不新增任何 policy = 對 anon / authenticated 全部拒絕。
-- 之後若要讓後台前端直接查詢，再針對 admins 加 policy 即可。
