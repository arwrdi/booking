import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { buildVerifyEmailPath, getCurrentAuthState } from "@/infrastructure/supabase/auth";
import { getMyBookings } from "@/infrastructure/supabase/bookingData";

import { cancelBooking, startMidtransPayment } from "./actions";

export const metadata: Metadata = {
  title: "My Bookings",
  description: "Daftar booking milik user yang sedang login.",
};

function formatDateTimeRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  return `${start.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })} • ${start.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatCurrency(value: number | undefined) {
  if (typeof value !== "number") {
    return "Harga belum tersedia";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusTone(status: string) {
  switch (status) {
    case "confirmed":
    case "completed":
      return "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300";
    case "in_progress":
      return "bg-blue-500/10 text-blue-700 ring-blue-600/20 dark:text-blue-300";
    case "pending_payment":
      return "bg-amber-500/10 text-amber-700 ring-amber-600/20 dark:text-amber-300";
    case "cancelled":
    case "expired":
      return "bg-rose-500/10 text-rose-700 ring-rose-600/20 dark:text-rose-300";
    default:
      return "bg-zinc-500/10 text-zinc-700 ring-zinc-600/20 dark:text-zinc-300";
  }
}

function getPaymentStatusLabel(paymentStatus: string) {
  const labels: Record<string, string> = {
    unbilled: "Belum ditagih",
    ready_to_pay: "Siap dibayar",
    pending: "Menunggu pembayaran",
    paid: "Lunas",
    failed: "Gagal",
    cancelled: "Dibatalkan",
    expired: "Kedaluwarsa",
  };
  return labels[paymentStatus] ?? paymentStatus;
}

const errorMessages: Record<string, string> = {
  cancel_failed:
    "Booking belum berhasil dibatalkan. Kemungkinan status booking sudah berubah atau slot ini sudah diproses lebih lanjut.",
  missing_booking: "ID booking tidak ditemukan saat mencoba membatalkan pesanan.",
  payment_missing_booking:
    "ID booking untuk pembayaran tidak terkirim atau booking sudah tidak ditemukan. Coba refresh halaman lalu tekan bayar lagi.",
  payment_create_failed:
    "Transaksi Midtrans belum berhasil dibuat. Periksa konfigurasi server key dan coba lagi.",
  payment_not_ready:
    "Booking ini tidak dalam kondisi siap dibayar lagi. Refresh halaman untuk melihat status terbaru.",
  payment_expired:
    "Waktu hold booking ini sudah habis, jadi pembayaran tidak bisa dilanjutkan lagi.",
  payment_missing_config:
    "Konfigurasi `MIDTRANS_SERVER_KEY` belum tersedia di environment server aplikasi.",
};

type MyBookingsPageProps = {
  searchParams: Promise<{
    created?: string;
    cancelled?: string;
    error?: string;
    payment?: string;
    payment_error?: string;
  }>;
};

export default async function MyBookingsPage({
  searchParams,
}: MyBookingsPageProps) {
  const { user, isEmailVerified } = await getCurrentAuthState();

  if (!user) {
    redirect("/login?next=/my-bookings");
  }

  if (!isEmailVerified) {
    redirect(buildVerifyEmailPath(user.email, "/my-bookings"));
  }

  const params = await searchParams;
  const { data: bookings, errorMessage } = await getMyBookings();
  const actionError = params.error ? errorMessages[params.error] : null;
  const paymentDetail = params.payment_error?.trim() || null;

  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="My Bookings"
          title="Pantau booking yang sudah kamu buat dari akun yang sedang aktif."
          description="Halaman ini memakai policy RLS `bookings select own or admin`, jadi user hanya melihat booking miliknya sendiri."
          actions={
            <Link
              href="/book"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Buat booking baru
            </Link>
          }
        />

        {params.created === "1" ? (
          <StateCard
            title="Booking berhasil dibuat"
            description="Booking sedang berjalan. Setelah layanan selesai, admin akan mengirim invoice dan kamu bisa melakukan pembayaran dari halaman ini."
          />
        ) : null}

        {params.cancelled === "1" ? (
          <StateCard
            title="Booking berhasil dibatalkan"
            description="Status booking diubah menjadi `cancelled` dan slot otomatis kembali tersedia untuk user lain."
          />
        ) : null}

        {params.payment === "pending" ? (
          <StateCard
            title="Transaksi Midtrans berhasil dibuat"
            description="Kamu akan diarahkan ke halaman pembayaran Midtrans. Kalau sempat menutupnya, gunakan tombol bayar lagi untuk melanjutkan transaksi yang sama."
          />
        ) : null}

        {actionError ? (
          <StateCard
            tone="warning"
            title="Aksi booking belum berhasil"
            description={
              paymentDetail ? `${actionError} Detail: ${paymentDetail}` : actionError
            }
          />
        ) : null}

        {errorMessage ? (
          <StateCard
            tone="warning"
            title="Booking belum bisa dimuat"
            description={errorMessage}
          />
        ) : null}

        {bookings.length > 0 ? (
          <section className="grid gap-4">
            {bookings.map((booking) => (
              <article
                key={booking.id}
                className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold tracking-tight">
                        {booking.service?.name ?? "Layanan tidak ditemukan"}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${getStatusTone(booking.status)}`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Worker: {booking.worker?.name ?? "Worker tidak ditemukan"}
                      {booking.worker?.specialization
                        ? ` • ${booking.worker.specialization}`
                        : ""}
                    </p>
                    <p className="text-sm font-medium">
                      {formatDateTimeRange(booking.start_at, booking.end_at)}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 md:text-right">
                    <p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                          booking.payment_status === "ready_to_pay"
                            ? "bg-blue-500/10 text-blue-700 ring-blue-600/20 dark:text-blue-300"
                            : booking.payment_status === "paid"
                              ? "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300"
                              : "bg-zinc-500/10 text-zinc-700 ring-zinc-600/20 dark:text-zinc-300"
                        }`}
                      >
                        {getPaymentStatusLabel(booking.payment_status)}
                      </span>
                    </p>
                    {booking.payment?.payment_method ? (
                      <p>Metode: {booking.payment.payment_method}</p>
                    ) : null}
                  </div>
                </div>

                {booking.notes ? (
                  <div className="mt-5 rounded-3xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    <p className="font-medium">Catatan</p>
                    <p className="mt-2">{booking.notes}</p>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  {booking.canPay ? (
                    <form action={startMidtransPayment.bind(null, booking.id)}>
                      <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                      >
                        {booking.payment?.redirect_url ? "Lanjutkan pembayaran" : "Bayar sekarang"}
                      </button>
                    </form>
                  ) : null}

                  {booking.payment_status === "paid" ? (
                    <a
                      href={`/api/bookings/${booking.id}/calendar`}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    >
                      Tambah ke kalender
                    </a>
                  ) : null}

                  {booking.canCancel ? (
                    <form action={cancelBooking}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70"
                      >
                        Batalkan booking
                      </button>
                    </form>
                  ) : null}
                </div>

                {!booking.canPay && !booking.canCancel && booking.payment_status !== "paid" ? (
                  <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
                    {booking.status === "in_progress"
                      ? "Layanan sedang berjalan. Tagihan akan muncul di sini setelah admin menyelesaikan layanan."
                      : "Booking ini tidak bisa diubah lagi."}
                  </p>
                ) : null}
              </article>
            ))}
          </section>
        ) : (
          <StateCard
            title="Belum ada booking"
            description="Mulai dari halaman booking untuk membuat transaksi pertama dengan akun yang sedang aktif."
          />
        )}
      </div>
    </SiteShell>
  );
}
