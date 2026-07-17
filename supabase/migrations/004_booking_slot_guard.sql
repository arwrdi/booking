create unique index if not exists idx_bookings_active_slot_unique
  on public.bookings (slot_id)
  where slot_id is not null
    and status in (
      'pending_payment'::public.booking_status,
      'confirmed'::public.booking_status,
      'in_progress'::public.booking_status
    );

create or replace function public.sync_slot_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.slot_id is not null then
      update public.availability_slots
      set is_available = not exists (
        select 1
        from public.bookings b
        where b.slot_id = old.slot_id
          and b.status in ('pending_payment', 'confirmed', 'in_progress')
      )
      where id = old.slot_id;
    end if;

    return old;
  end if;

  if new.slot_id is not null then
    update public.availability_slots
    set is_available = not exists (
      select 1
      from public.bookings b
      where b.slot_id = new.slot_id
        and b.status in ('pending_payment', 'confirmed', 'in_progress')
    )
    where id = new.slot_id;
  end if;

  if tg_op = 'UPDATE' and old.slot_id is not null and old.slot_id <> new.slot_id then
    update public.availability_slots
    set is_available = not exists (
      select 1
      from public.bookings b
      where b.slot_id = old.slot_id
        and b.status in ('pending_payment', 'confirmed', 'in_progress')
    )
    where id = old.slot_id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_slot_availability_after_booking_change on public.bookings;
create trigger sync_slot_availability_after_booking_change
after insert or update or delete on public.bookings
for each row
execute function public.sync_slot_availability();
