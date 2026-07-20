# Supabase Setup Order

Gunakan urutan berikut untuk setup project awal:

1. `migrations/001_initial_schema.sql`
   Membuat enum, tabel inti, index, dan trigger `updated_at`.

2. `migrations/002_initial_rls.sql`
   Mengaktifkan RLS dan membuat policy untuk tabel yang sudah ada:
   `services`, `workers`, `availability_slots`, `profiles`, `bookings`.

3. `migrations/003_auth_profile_trigger.sql`
   Membuat trigger agar user yang login via Google otomatis punya baris di `profiles`.

4. `migrations/004_booking_slot_guard.sql`
   Menambahkan unique index slot aktif dan trigger agar `availability_slots.is_available`
   ikut sinkron dengan status booking.

5. `migrations/005_worker_service_relations.sql`
   Membuat tabel relasi `worker_services` agar tidak semua worker bisa mengerjakan semua service.

6. `migrations/006_booking_cancellation.sql`
   Menambahkan SQL function aman untuk cancel booking milik user sendiri tanpa membuka
   policy `UPDATE` umum pada tabel `bookings`.

7. `migrations/007_booking_integrity_hardening.sql`
   Membersihkan booking aktif ganda yang sudah terlanjur terbentuk, mengunci ulang unique
   index slot aktif, dan menambahkan function atomik `create_my_booking(...)`.

8. `migrations/008_auto_expire_pending_bookings.sql`
   Menambahkan auto-expire booking `pending_payment` via function SQL + `pg_cron` setiap
   menit, sekaligus memperbarui `create_my_booking(...)` agar booking hold yang sudah lewat
   langsung dibersihkan saat slot yang sama dicoba ulang.

9. `migrations/009_profile_trigger_store_phone.sql`
   Memperbarui trigger `handle_new_user()` agar metadata registrasi seperti nomor HP ikut
   tersimpan ke `public.profiles`.

10. `migrations/010_midtrans_payments.sql`
   Membuat tabel `payments` untuk menyimpan order Midtrans, status pembayaran, payload
   transaksi, dan data webhook agar sinkron dengan status booking.

11. `migrations/seed_dummy_data.sql`
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
- Untuk integrasi Midtrans sandbox, isi `MIDTRANS_SERVER_KEY` di `.env.local` lalu arahkan
  Notification URL Midtrans ke `[base-url]/api/payments/midtrans/webhook`.
