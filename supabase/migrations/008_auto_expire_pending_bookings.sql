create index if not exists idx_bookings_pending_hold_until
  on public.bookings (held_until)
  where status = 'pending_payment'::public.booking_status
    and held_until is not null;

create or replace function public.expire_pending_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer := 0;
begin
  with expired_rows as (
    update public.bookings
    set
      status = 'expired',
      payment_status = case
        when payment_status = 'pending' then 'expired'
        else payment_status
      end,
      held_until = null
    where status = 'pending_payment'
      and held_until is not null
      and held_until < now()
      and actual_start_at is null
      and actual_end_at is null
    returning id
  )
  select count(*)
  into expired_count
  from expired_rows;

  return expired_count;
end;
$$;

revoke all on function public.expire_pending_bookings() from public;
grant execute on function public.expire_pending_bookings() to authenticated;

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

  update public.bookings
  set
    status = 'expired',
    payment_status = case
      when payment_status = 'pending' then 'expired'
      else payment_status
    end,
    held_until = null
  where slot_id = target_slot_id
    and status = 'pending_payment'
    and held_until is not null
    and held_until < now()
    and actual_start_at is null
    and actual_end_at is null;

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

create extension if not exists pg_cron;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'expire-pending-bookings'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'expire-pending-bookings',
    '* * * * *',
    $job$select public.expire_pending_bookings();$job$
  );
end;
$$;

select public.expire_pending_bookings();
