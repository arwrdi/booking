# Supabase Setup Order

Gunakan urutan berikut untuk setup project awal:

1. `migrations/001_initial_schema.sql`
   Membuat enum, tabel inti, index, dan trigger `updated_at`.

2. `migrations/002_initial_rls.sql`
   Mengaktifkan RLS dan membuat policy untuk tabel yang sudah ada:
   `services`, `workers`, `availability_slots`, `profiles`, `bookings`.

3. `migrations/003_auth_profile_trigger.sql`
   Membuat trigger agar user yang login via Google otomatis punya baris di `profiles`.

4. `migrations/seed_dummy_data.sql`
   Mengisi data dummy untuk `services`, `workers`, dan `availability_slots`.

## Verifikasi cepat

Setelah file dijalankan, cek query berikut:

```sql
select count(*) as services_count from public.services;
select count(*) as workers_count from public.workers;
select count(*) as slots_count from public.availability_slots;
```

## Catatan

- Jangan tambahkan policy untuk `payments`, `booking_audit_log`, atau `worker_access_tokens`
  sebelum tabelnya benar-benar dibuat.
- Untuk halaman publik saat ini, data yang dibuka ke `anon` hanya:
  `services`, `workers`, dan `availability_slots`.
