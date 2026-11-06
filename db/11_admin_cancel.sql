-- 教練後台手動取消：整場停課、強制取消單筆預約。
-- 退堂與改狀態在同一個交易內完成（不會退一半），並回傳被退堂的會員，供 LINE 通知。
-- 重複呼叫安全：已取消的場次／預約直接回傳 cancelled=false，不會重複退堂或重複通知。

-- 整場停課：取消所有有效預約（含已點名的出席／未到）、各退 1 堂，場次標記為手動停課
-- 回傳 jsonb：{ cancelled: bool, members: [被退堂的 member_id...] }
create or replace function admin_cancel_session(p_session_id uuid)
returns jsonb language plpgsql as $$
declare
  v_session class_sessions%rowtype;
  v_members uuid[] := '{}';
  b         record;
begin
  -- 與 close_session()、book_session() 鎖同一列：同時發生時依序處理
  select * into v_session from class_sessions where id = p_session_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_session.status <> 'scheduled' then
    return jsonb_build_object('cancelled', false, 'members', '[]'::jsonb);
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
    set status = 'cancelled', cancel_reason = 'manual', closed_at = now()
    where id = p_session_id;

  return jsonb_build_object('cancelled', true, 'members', to_jsonb(v_members));
end; $$;

-- 強制取消單筆預約並退 1 堂（不受開課前 3 小時限制）
-- 回傳 jsonb：{ cancelled: bool, member_id, session_id }
create or replace function admin_cancel_booking(p_booking_id uuid)
returns jsonb language plpgsql as $$
declare
  v bookings%rowtype;
begin
  select * into v from bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v.status not in ('booked','attended','no_show') then
    return jsonb_build_object('cancelled', false);
  end if;

  update bookings set status = 'cancelled', cancelled_at = now() where id = p_booking_id;
  if v.wallet_id is not null then
    update credit_wallets set remaining_credits = remaining_credits + 1 where id = v.wallet_id;
  end if;

  return jsonb_build_object('cancelled', true, 'member_id', v.member_id, 'session_id', v.session_id);
end; $$;
