with duplicate_active_bookings as (
  select
    id,
    row_number() over (
      partition by slot_id
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.bookings
  where slot_id is not null
    and status in (
      'pending_payment'::public.booking_status,
      'confirmed'::public.booking_status,
      'in_progress'::public.booking_status
    )
)
update public.bookings as b
set
  status = 'cancelled',
  payment_status = case
    when b.payment_status = 'pending' then 'cancelled'
    else b.payment_status
  end,
  held_until = null
from duplicate_active_bookings as duplicates
where b.id = duplicates.id
  and duplicates.duplicate_rank > 1;

drop index if exists idx_bookings_active_slot_unique;
create unique index idx_bookings_active_slot_unique
  on public.bookings (slot_id)
  where slot_id is not null
    and status in (
      'pending_payment'::public.booking_status,
      'confirmed'::public.booking_status,
      'in_progress'::public.booking_status
    );

create or replace function public.create_my_booking(
  target_service_id uuid,
  target_slot_id uuid,
  booking_notes text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  service_record public.services%rowtype;
  slot_record public.availability_slots%rowtype;
  trimmed_notes text;
begin
  if auth.uid() is null then
    return 'unauthorized';
  end if;

  if target_service_id is null or target_slot_id is null then
    return 'missing_fields';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
  ) then
    return 'profile_missing';
  end if;

  select *
  into service_record
  from public.services
  where id = target_service_id
    and is_active = true;

  if not found then
    return 'service_missing';
  end if;

  select *
  into slot_record
  from public.availability_slots
  where id = target_slot_id
  for update;

  if not found then
    return 'slot_missing';
  end if;

  if not exists (
    select 1
    from public.worker_services
    where worker_id = slot_record.worker_id
      and service_id = service_record.id
  ) then
    return 'service_not_supported';
  end if;

  if exists (
    select 1
    from public.bookings
    where slot_id = slot_record.id
      and status in (
        'pending_payment'::public.booking_status,
        'confirmed'::public.booking_status,
        'in_progress'::public.booking_status
      )
  ) then
    update public.availability_slots
    set is_available = false
    where id = slot_record.id;

    return 'slot_taken';
  end if;

  if slot_record.is_available is not true then
    return 'slot_unavailable';
  end if;

  trimmed_notes = nullif(left(coalesce(booking_notes, ''), 500), '');

  insert into public.bookings (
    customer_id,
    worker_id,
    service_id,
    slot_id,
    booking_date,
    start_at,
    end_at,
    status,
    payment_status,
    notes,
    held_until
  )
  values (
    auth.uid(),
    slot_record.worker_id,
    service_record.id,
    slot_record.id,
    slot_record.start_at::date,
    slot_record.start_at,
    slot_record.end_at,
    'pending_payment',
    'pending',
    trimmed_notes,
    now() + interval '15 minutes'
  );

  return 'created';
exception
  when unique_violation then
    update public.availability_slots
    set is_available = false
    where id = target_slot_id;

    return 'slot_taken';
end;
$$;

revoke all on function public.create_my_booking(uuid, uuid, text) from public;
grant execute on function public.create_my_booking(uuid, uuid, text) to authenticated;

update public.availability_slots as slots
set is_available = not exists (
  select 1
  from public.bookings as bookings
  where bookings.slot_id = slots.id
    and bookings.status in (
      'pending_payment'::public.booking_status,
      'confirmed'::public.booking_status,
      'in_progress'::public.booking_status
    )
);
