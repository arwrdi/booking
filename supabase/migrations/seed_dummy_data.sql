-- Seed data awal untuk MVP booking.
-- Aman untuk dijalankan berulang karena insert memakai pengecekan data existing.

insert into public.services (
  name,
  category,
  description,
  price,
  duration_minutes,
  image_url,
  is_active
)
select
  seed.name,
  seed.category,
  seed.description,
  seed.price,
  seed.duration_minutes,
  seed.image_url,
  true
from (
  values
    (
      'Haircut Pria',
      'Haircut',
      'Potong rambut pria dengan styling ringan.',
      50000,
      45,
      null
    ),
    (
      'Haircut Wanita',
      'Haircut',
      'Potong dan rapikan rambut wanita.',
      90000,
      60,
      null
    ),
    (
      'Creambath',
      'Treatment',
      'Perawatan rambut dan scalp relaxation.',
      120000,
      60,
      null
    ),
    (
      'Coloring Basic',
      'Coloring',
      'Pewarnaan dasar untuk sentuhan warna baru.',
      250000,
      120,
      null
    )
) as seed(name, category, description, price, duration_minutes, image_url)
where not exists (
  select 1
  from public.services s
  where s.name = seed.name
);

insert into public.workers (
  name,
  specialization,
  photo_url,
  is_active
)
select
  seed.name,
  seed.specialization,
  seed.photo_url,
  true
from (
  values
    (
      'Alya',
      'Haircut & Styling',
      null
    ),
    (
      'Bima',
      'Coloring Specialist',
      null
    ),
    (
      'Citra',
      'Treatment & Creambath',
      null
    )
) as seed(name, specialization, photo_url)
where not exists (
  select 1
  from public.workers w
  where w.name = seed.name
);

insert into public.worker_services (
  worker_id,
  service_id
)
select
  w.id,
  s.id
from (
  values
    ('Alya', 'Haircut Pria'),
    ('Alya', 'Haircut Wanita'),
    ('Bima', 'Haircut Pria'),
    ('Bima', 'Coloring Basic'),
    ('Citra', 'Creambath'),
    ('Citra', 'Haircut Wanita')
) as relation(worker_name, service_name)
join public.workers w
  on w.name = relation.worker_name
join public.services s
  on s.name = relation.service_name
where not exists (
  select 1
  from public.worker_services ws
  where ws.worker_id = w.id
    and ws.service_id = s.id
);

with slot_templates as (
  select time '09:00' as start_time, time '09:45' as end_time
  union all
  select time '10:00', time '11:00'
  union all
  select time '11:15', time '12:15'
  union all
  select time '13:30', time '14:30'
  union all
  select time '15:00', time '16:30'
),
schedule_days as (
  select generate_series(
    current_date + interval '1 day',
    current_date + interval '7 day',
    interval '1 day'
  )::date as day
),
candidate_slots as (
  select
    w.id as worker_id,
    (d.day + t.start_time)::timestamptz as start_at,
    (d.day + t.end_time)::timestamptz as end_at
  from public.workers w
  cross join schedule_days d
  cross join slot_templates t
  where w.is_active = true
)
insert into public.availability_slots (
  worker_id,
  start_at,
  end_at,
  is_available
)
select
  candidate.worker_id,
  candidate.start_at,
  candidate.end_at,
  true
from candidate_slots candidate
where not exists (
  select 1
  from public.availability_slots a
  where a.worker_id = candidate.worker_id
    and a.start_at = candidate.start_at
    and a.end_at = candidate.end_at
);

-- Catatan:
-- Seed untuk profiles dan bookings sengaja belum dimasukkan karena profiles.id
-- harus mereferensikan auth.users yang benar-benar ada di project Supabase.
