[OPEN] Midtrans second payment failure

## Session
- session_id: `midtrans-second-payment`
- started_at: `2026-07-19`
- symptom: transaksi pertama bisa redirect ke Midtrans, transaksi berikutnya gagal dengan pesan generik `payment_create_failed`

## Hypotheses
1. Midtrans mengembalikan error spesifik untuk transaksi kedua, tetapi UI hanya menampilkan pesan generik.
2. `upsert` ke tabel `payments` gagal setelah transaksi Snap berhasil dibuat.
3. Booking kedua/status payment masuk ke flow yang salah sebelum create transaction.
4. Env Midtrans yang terbaca server tidak konsisten pada request berikutnya.

## Plan
- Tambahkan instrumentation hanya pada jalur `payment_create_failed`.
- Tampilkan pesan error asli dari Midtrans atau database di UI.
- Kumpulkan bukti runtime dari satu percobaan transaksi kedua.
