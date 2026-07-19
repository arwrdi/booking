create or replace function public.cancel_my_booking(target_booking_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_booking_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  update public.bookings
  set
    status = 'cancelled',
    payment_status = case
      when payment_status = 'pending' then 'cancelled'
      else payment_status
    end,
    held_until = null
  where id = target_booking_id
    and customer_id = auth.uid()
    and status in ('pending_payment', 'confirmed')
    and coalesce(payment_status, 'pending') <> 'paid'
    and actual_start_at is null
    and actual_end_at is null
  returning id into updated_booking_id;

  return updated_booking_id is not null;
end;
$$;

revoke all on function public.cancel_my_booking(uuid) from public;
grant execute on function public.cancel_my_booking(uuid) to authenticated;
