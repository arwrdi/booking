create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'app_role'
  ) then
    create type public.app_role as enum ('customer', 'admin');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'booking_status'
  ) then
    create type public.booking_status as enum (
      'pending_payment',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'expired',
      'no_show'
    );
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialization text,
  photo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  price integer not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  constraint availability_slots_time_check check (end_at > start_at)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  worker_id uuid not null references public.workers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  slot_id uuid references public.availability_slots(id) on delete set null,
  booking_date date not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.booking_status not null default 'pending_payment',
  payment_status text not null default 'pending',
  notes text,
  held_until timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_time_check check (end_at > start_at)
);

create index if not exists idx_workers_active
  on public.workers (is_active);

create index if not exists idx_services_active
  on public.services (is_active);

create index if not exists idx_availability_slots_worker_start
  on public.availability_slots (worker_id, start_at);

create unique index if not exists idx_availability_slots_worker_time_unique
  on public.availability_slots (worker_id, start_at, end_at);

create index if not exists idx_bookings_customer
  on public.bookings (customer_id);

create index if not exists idx_bookings_worker_date
  on public.bookings (worker_id, booking_date);

create index if not exists idx_bookings_status
  on public.bookings (status);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_workers_updated_at on public.workers;
create trigger set_workers_updated_at
before update on public.workers
for each row
execute function public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row
execute function public.set_updated_at();

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
before update on public.bookings
for each row
execute function public.set_updated_at();
