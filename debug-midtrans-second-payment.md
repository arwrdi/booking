[CLOSED] Midtrans second payment failure

## Session
- session_id: `midtrans-second-payment`
- started_at: `2026-07-19`
- closed_at: `2026-07-21`
- symptom: transaksi pertama bisa redirect ke Midtrans, transaksi berikutnya gagal dengan pesan generik `payment_create_failed`

## Root cause
1. Payment pending lama selalu di-resume lewat `redirect_url` Snap yang sudah expired.
2. Recreate Snap memakai `upsert` yang rawan bentrok unique `provider_order_id` / row lama tanpa strategi update eksplisit.
3. Error Midtrans/database tidak selalu ditampilkan jelas di UI.

## Fix
- Resume Snap hanya jika payment `pending` dan `created_at` masih dalam jendela ~14 menit.
- Attempt berikutnya membuat `order_id` baru lalu `update` row payment existing (atau `insert` jika belum ada).
- Error detail ditampilkan lewat query `payment_error` di `/my-bookings`.
