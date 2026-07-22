-- ============================================================
-- 013: Admin boleh ubah invoice/jadwal selama masih dikerjakan
--      (in_progress) dan belum paid. Termasuk reopen dari ready_to_pay.
-- ============================================================

-- Helper: status yang masih bisa diintervensi admin
-- (in_progress / confirmed / pending_payment legacy, atau completed tapi belum bayar)

create or replace function public.admin_add_booking_item(
  target_booking_id uuid,
  target_service_id uuid,
  item_qty          integer default 1
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  service_record public.services%rowtype;
  booking_rec    public.bookings%rowtype;
begin
  if not public.is_admin() then
    return 'unauthorized';
  end if;

  select * into booking_rec
  from public.bookings
  where id = target_booking_id
  for update;

  if not found then
    return 'booking_not_found';
  end if;

  if booking_rec.payment_status = 'paid' then
    return 'already_paid';
  end if;

  if booking_rec.status in ('cancelled', 'expired', 'no_show') then
    return 'booking_not_active';
  end if;

  select * into service_record
  from public.services
  where id = target_service_id and is_active = true;

  if not found then
    return 'service_not_found';
  end if;

  insert into public.booking_invoice_items (
    booking_id, service_id, service_name, price, qty, added_by_admin
  )
  values (
    target_booking_id,
    service_record.id,
    service_record.name,
    service_record.price,
    greatest(1, item_qty),
    true
  );

  -- Jika sudah ditutup (ready_to_pay), buka lagi supaya admin bisa lanjut edit
  -- lalu tagih ulang setelah perubahan layanan.
  if booking_rec.payment_status = 'ready_to_pay'
     or booking_rec.status = 'completed' then
    update public.bookings
    set
      status         = 'in_progress',
      payment_status = 'unbilled',
      actual_end_at  = null
    where id = target_booking_id;
  end if;

  return 'added';
end;
$$;

revoke all on function public.admin_add_booking_item(uuid, uuid, integer) from public;
grant execute on function public.admin_add_booking_item(uuid, uuid, integer) to authenticated;

create or replace function public.admin_remove_booking_item(
  target_item_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  item_rec    public.booking_invoice_items%rowtype;
  booking_rec public.bookings%rowtype;
  remaining   integer;
begin
  if not public.is_admin() then
    return 'unauthorized';
  end if;

  select * into item_rec
  from public.booking_invoice_items
  where id = target_item_id
  for update;

  if not found then
    return 'item_not_found';
  end if;

  select * into booking_rec
  from public.bookings
  where id = item_rec.booking_id
  for update;

  if not found then
    return 'booking_not_found';
  end if;

  if booking_rec.payment_status = 'paid' then
    return 'already_paid';
  end if;

  if booking_rec.status in ('cancelled', 'expired', 'no_show') then
    return 'booking_not_active';
  end if;

  delete from public.booking_invoice_items
  where id = target_item_id;

  -- Reopen invoice jika sudah pernah ditutup
  if booking_rec.payment_status = 'ready_to_pay'
     or booking_rec.status = 'completed' then
    update public.bookings
    set
      status         = 'in_progress',
      payment_status = 'unbilled',
      actual_end_at  = null
    where id = booking_rec.id;
  end if;

  select count(*) into remaining
  from public.booking_invoice_items
  where booking_id = booking_rec.id;

  if remaining = 0 then
    return 'item_removed_empty';
  end if;

  return 'item_removed';
end;
$$;

revoke all on function public.admin_remove_booking_item(uuid) from public;
grant execute on function public.admin_remove_booking_item(uuid) to authenticated;

create or replace function public.admin_reschedule_booking(
  target_booking_id uuid,
  target_slot_id    uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_rec public.bookings%rowtype;
  new_slot    public.availability_slots%rowtype;
  old_slot_id uuid;
begin
  if not public.is_admin() then
    return 'unauthorized';
  end if;

  if target_booking_id is null or target_slot_id is null then
    return 'missing_fields';
  end if;

  select * into booking_rec
  from public.bookings
  where id = target_booking_id
  for update;

  if not found then
    return 'booking_not_found';
  end if;

  if booking_rec.payment_status = 'paid' then
    return 'already_paid';
  end if;

  -- Boleh reschedule selama masih dikerjakan / belum lunas
  if booking_rec.status in ('cancelled', 'expired', 'no_show') then
    return 'booking_not_active';
  end if;

  if booking_rec.slot_id is not null and booking_rec.slot_id = target_slot_id then
    return 'rescheduled';
  end if;

  select * into new_slot
  from public.availability_slots
  where id = target_slot_id
  for update;

  if not found then
    return 'slot_missing';
  end if;

  if new_slot.worker_id <> booking_rec.worker_id then
    return 'slot_wrong_worker';
  end if;

  if new_slot.is_available is not true then
    return 'slot_unavailable';
  end if;

  if exists (
    select 1 from public.bookings
    where slot_id = new_slot.id
      and id <> target_booking_id
      and status in (
        'pending_payment'::public.booking_status,
        'confirmed'::public.booking_status,
        'in_progress'::public.booking_status
      )
  ) then
    return 'slot_taken';
  end if;

  old_slot_id := booking_rec.slot_id;

  update public.bookings
  set
    slot_id      = new_slot.id,
    booking_date = new_slot.start_at::date,
    start_at     = new_slot.start_at,
    end_at       = new_slot.end_at,
    -- kalau sudah completed tapi belum bayar, buka lagi ke in_progress
    status = case
      when status = 'completed' then 'in_progress'::public.booking_status
      else status
    end,
    payment_status = case
      when payment_status = 'ready_to_pay' then 'unbilled'
      else payment_status
    end,
    actual_end_at = case
      when status = 'completed' then null
      else actual_end_at
    end
  where id = target_booking_id;

  update public.availability_slots
  set is_available = false
  where id = new_slot.id;

  if old_slot_id is not null and old_slot_id <> new_slot.id then
    update public.availability_slots
    set is_available = true
    where id = old_slot_id
      and not exists (
        select 1 from public.bookings
        where slot_id = old_slot_id
          and id <> target_booking_id
          and status in (
            'pending_payment'::public.booking_status,
            'confirmed'::public.booking_status,
            'in_progress'::public.booking_status
          )
      );
  end if;

  return 'rescheduled';
exception
  when unique_violation then
    return 'slot_taken';
end;
$$;

revoke all on function public.admin_reschedule_booking(uuid, uuid) from public;
grant execute on function public.admin_reschedule_booking(uuid, uuid) to authenticated;
