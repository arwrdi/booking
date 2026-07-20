create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  provider text not null default 'midtrans',
  provider_order_id text not null unique,
  provider_transaction_id text,
  payment_method text,
  amount integer not null check (amount >= 0),
  currency text not null default 'IDR',
  status text not null default 'pending',
  snap_token text,
  redirect_url text,
  status_message text,
  raw_transaction jsonb not null default '{}'::jsonb,
  raw_notification jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_status
  on public.payments (status);

create index if not exists idx_payments_paid_at
  on public.payments (paid_at);

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

alter table public.payments enable row level security;

drop policy if exists "payments select own or admin" on public.payments;
create policy "payments select own or admin"
on public.payments
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.bookings
    where bookings.id = payments.booking_id
      and bookings.customer_id = auth.uid()
  )
);

drop policy if exists "payments admin manage" on public.payments;
create policy "payments admin manage"
on public.payments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
