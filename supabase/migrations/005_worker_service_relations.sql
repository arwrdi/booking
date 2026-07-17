create table if not exists public.worker_services (
  worker_id uuid not null references public.workers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (worker_id, service_id)
);

create index if not exists idx_worker_services_service
  on public.worker_services (service_id);

alter table public.worker_services enable row level security;

drop policy if exists "public can read worker service relations" on public.worker_services;
create policy "public can read worker service relations"
on public.worker_services
for select
to anon, authenticated
using (true);
