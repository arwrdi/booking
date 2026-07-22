-- ============================================================
-- 012: Admin reschedule booking + remove invoice item
-- ============================================================

-- 1. Admin: hapus satu item dari invoice booking aktif
create or replace function public.admin_remove_booking_item(
  target_item_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  item_rec   public.booking_invoice_items%rowtype;
  booking_rec public.bookings%rowtype;
  remaining  integer;
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

  if booking_rec.status not in ('in_progress', 'confirmed') then
    return 'booking_not_active';
  end if;

  if booking_rec.payment_status in ('paid', 'ready_to_pay', 'pending') then
    return 'invoice_locked';
  end if;

  delete from public.booking_invoice_items
  where id = target_item_id;

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

-- 2. Admin: pindahkan booking ke slot lain (ubah tanggal/jam)
--    Slot baru harus milik worker yang sama dan tersedia.
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

  if booking_rec.status not in ('in_progress', 'confirmed') then
    return 'booking_not_active';
  end if;

  if booking_rec.payment_status = 'paid' then
    return 'already_paid';
  end if;

  -- Slot yang sama → no-op sukses
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

  -- Slot sudah dipakai booking aktif lain?
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
    end_at       = new_slot.end_at
  where id = target_booking_id;

  -- Kunci slot baru
  update public.availability_slots
  set is_available = false
  where id = new_slot.id;

  -- Lepas slot lama (jika berbeda)
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
