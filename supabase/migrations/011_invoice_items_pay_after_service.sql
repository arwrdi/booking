-- ============================================================
-- 011: Invoice items + pay-after-service flow
-- Booking tidak lagi membutuhkan held_until / auto-expire
-- karena pembayaran dilakukan setelah layanan selesai, bukan saat booking.
-- ============================================================

-- 1. Tambah nilai payment_status baru yang dipakai flow baru.
--    Nilai lama (pending, paid, cancelled, expired, failed) tetap ada untuk kompatibilitas.
--    'unbilled'      = booking dibuat, belum ada invoice (default baru)
--    'ready_to_pay'  = admin menutup layanan, user bisa bayar
do $$
begin
  -- Tidak ada cara aman alter enum tanpa drop di PostgreSQL < 15,
  -- jadi kita pakai text untuk payment_status (sudah text dari awal).
  -- Tidak perlu alter type.
  null;
end;
$$;

-- 2. Tabel booking_invoice_items
create table if not exists public.booking_invoice_items (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  service_id      uuid references public.services(id) on delete set null,
  service_name    text not null,
  price           integer not null check (price >= 0),
  qty             integer not null default 1 check (qty > 0),
  added_by_admin  boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists idx_invoice_items_booking
  on public.booking_invoice_items (booking_id);

-- 3. RLS invoice items
alter table public.booking_invoice_items enable row level security;

drop policy if exists "invoice items select own or admin" on public.booking_invoice_items;
create policy "invoice items select own or admin"
on public.booking_invoice_items
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.bookings
    where bookings.id = booking_invoice_items.booking_id
      and bookings.customer_id = auth.uid()
  )
);

drop policy if exists "invoice items admin manage" on public.booking_invoice_items;
create policy "invoice items admin manage"
on public.booking_invoice_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 4. Kolom portofolio di workers
alter table public.workers
  add column if not exists bio text,
  add column if not exists portfolio_urls text[] not null default '{}';

-- 5. Ubah fungsi create_my_booking: booking dibuat dengan status 'in_progress'
--    dan payment_status 'unbilled' (tanpa held_until, tanpa auto-expire slot).
--    Slot tetap dikunci (is_available = false) sampai booking selesai/cancel.
create or replace function public.create_my_booking(
  target_service_id uuid,
  target_slot_id    uuid,
  booking_notes     text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  service_record public.services%rowtype;
  slot_record    public.availability_slots%rowtype;
  trimmed_notes  text;
  new_booking_id uuid;
begin
  if auth.uid() is null then
    return 'unauthorized';
  end if;

  if target_service_id is null or target_slot_id is null then
    return 'missing_fields';
  end if;

  if not exists (
    select 1 from public.profiles where id = auth.uid()
  ) then
    return 'profile_missing';
  end if;

  select * into service_record
  from public.services
  where id = target_service_id and is_active = true;

  if not found then
    return 'service_missing';
  end if;

  -- Hapus booking expired lama di slot yang sama agar slot bisa dipakai ulang
  update public.bookings
  set status = 'expired', payment_status = 'expired', held_until = null
  where slot_id = target_slot_id
    and status = 'pending_payment'
    and held_until is not null
    and held_until < now()
    and actual_start_at is null
    and actual_end_at is null;

  select * into slot_record
  from public.availability_slots
  where id = target_slot_id
  for update;

  if not found then
    return 'slot_missing';
  end if;

  if not exists (
    select 1 from public.worker_services
    where worker_id = slot_record.worker_id
      and service_id = service_record.id
  ) then
    return 'service_not_supported';
  end if;

  if exists (
    select 1 from public.bookings
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
    customer_id, worker_id, service_id, slot_id,
    booking_date, start_at, end_at,
    status, payment_status, notes, held_until
  )
  values (
    auth.uid(),
    slot_record.worker_id,
    service_record.id,
    slot_record.id,
    slot_record.start_at::date,
    slot_record.start_at,
    slot_record.end_at,
    'in_progress',   -- langsung in_progress karena bayar di akhir
    'unbilled',      -- belum ada invoice
    trimmed_notes,
    null             -- tidak ada held_until
  )
  returning id into new_booking_id;

  -- Kunci slot
  update public.availability_slots
  set is_available = false
  where id = slot_record.id;

  -- Buat invoice item awal dari layanan yang dipilih
  insert into public.booking_invoice_items (
    booking_id, service_id, service_name, price, qty, added_by_admin
  )
  values (
    new_booking_id,
    service_record.id,
    service_record.name,
    service_record.price,
    1,
    false
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

-- 6. Admin: tambah item layanan ke booking yang masih in_progress
create or replace function public.admin_add_booking_item(
  target_booking_id uuid,
  target_service_id uuid,
  item_qty          integer default 1
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  service_record public.services%rowtype;
  booking_status_val text;
begin
  if not public.is_admin() then
    return 'unauthorized';
  end if;

  select status into booking_status_val
  from public.bookings
  where id = target_booking_id;

  if not found then
    return 'booking_not_found';
  end if;

  if booking_status_val not in ('in_progress', 'confirmed') then
    return 'booking_not_active';
  end if;

  select * into service_record
  from public.services
  where id = target_service_id and is_active = true;

  if not found then
    return 'service_not_found';
  end if;

  insert into public.booking_invoice_items (
    booking_id, service_id, service_name, price, qty, added_by_admin
  )
  values (
    target_booking_id,
    service_record.id,
    service_record.name,
    service_record.price,
    greatest(1, item_qty),
    true
  );

  return 'added';
end;
$$;

revoke all on function public.admin_add_booking_item(uuid, uuid, integer) from public;
grant execute on function public.admin_add_booking_item(uuid, uuid, integer) to authenticated;

-- 7. Admin: tutup layanan, set payment_status = 'ready_to_pay'
create or replace function public.admin_mark_booking_completed(
  target_booking_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_rec public.bookings%rowtype;
  invoice_total integer;
begin
  if not public.is_admin() then
    return 'unauthorized';
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

  -- Hitung total invoice items
  select coalesce(sum(price * qty), 0) into invoice_total
  from public.booking_invoice_items
  where booking_id = target_booking_id;

  if invoice_total <= 0 then
    return 'no_invoice_items';
  end if;

  update public.bookings
  set
    status         = 'completed',
    payment_status = 'ready_to_pay',
    actual_end_at  = now()
  where id = target_booking_id;

  -- Buka slot agar bisa dipakai booking baru
  if booking_rec.slot_id is not null then
    update public.availability_slots
    set is_available = true
    where id = booking_rec.slot_id;
  end if;

  return 'completed';
end;
$$;

revoke all on function public.admin_mark_booking_completed(uuid) from public;
grant execute on function public.admin_mark_booking_completed(uuid) to authenticated;

-- 8. Admin: cancel booking (override cancel_my_booking agar admin bisa cancel in_progress)
create or replace function public.admin_cancel_booking(
  target_booking_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_rec public.bookings%rowtype;
begin
  if not public.is_admin() then
    return 'unauthorized';
  end if;

  select * into booking_rec
  from public.bookings
  where id = target_booking_id
  for update;

  if not found then
    return 'booking_not_found';
  end if;

  if booking_rec.status in ('paid', 'completed') and booking_rec.payment_status = 'paid' then
    return 'already_paid';
  end if;

  update public.bookings
  set
    status         = 'cancelled',
    payment_status = case when payment_status = 'unbilled' then 'cancelled' else payment_status end,
    held_until     = null
  where id = target_booking_id;

  if booking_rec.slot_id is not null then
    update public.availability_slots
    set is_available = true
    where id = booking_rec.slot_id;
  end if;

  return 'cancelled';
end;
$$;

revoke all on function public.admin_cancel_booking(uuid) from public;
grant execute on function public.admin_cancel_booking(uuid) to authenticated;

-- 9. Availability slots: publik bisa baca semua slot (tersedia maupun tidak)
--    agar halaman booking bisa tampilkan slot per tanggal (tidak filter is_available=true saja)
--    Filter tampilan dilakukan di app layer.
drop policy if exists "public can read available slots" on public.availability_slots;
create policy "public can read all slots"
on public.availability_slots
for select
to anon, authenticated
using (true);

-- 10. Query per tanggal memakai index existing
--    idx_availability_slots_worker_start (worker_id, start_at).
--    Jangan buat index expression (start_at::date): cast timestamptz→date
--    bergantung timezone session, jadi tidak IMMUTABLE (error 42P17).
