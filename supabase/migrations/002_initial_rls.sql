create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.services enable row level security;
alter table public.workers enable row level security;
alter table public.availability_slots enable row level security;
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "public can read active services" on public.services;
create policy "public can read active services"
on public.services
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "public can read active workers" on public.workers;
create policy "public can read active workers"
on public.workers
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "public can read available slots" on public.availability_slots;
create policy "public can read available slots"
on public.availability_slots
for select
to anon, authenticated
using (is_available = true);

drop policy if exists "profiles select self or admin" on public.profiles;
create policy "profiles select self or admin"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
);

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
);

drop policy if exists "profiles update self or admin" on public.profiles;
create policy "profiles update self or admin"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
)
with check (
  id = auth.uid()
  or public.is_admin()
);

drop policy if exists "bookings select own or admin" on public.bookings;
create policy "bookings select own or admin"
on public.bookings
for select
to authenticated
using (
  customer_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "bookings insert own pending" on public.bookings;
create policy "bookings insert own pending"
on public.bookings
for insert
to authenticated
with check (
  customer_id = auth.uid()
  and status = 'pending_payment'
  and payment_status = 'pending'
);

drop policy if exists "bookings admin manage" on public.bookings;
create policy "bookings admin manage"
on public.bookings
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);
