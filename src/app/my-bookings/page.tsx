import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { buildVerifyEmailPath, getCurrentAuthState } from "@/infrastructure/supabase/auth";
import { getMyBookings } from "@/infrastructure/supabase/bookingData";

import { cancelBooking, startMidtransPayment } from "./actions";

export const metadata: Metadata = {
  title: "Pesanan saya",
  description: "Daftar booking milikmu.",
};

function formatDateTimeRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  return `${start.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })} · ${start.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })}–${end.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getStatusTone(status: string) {
  switch (status) {
    case "confirmed":
    case "completed":
      return "bg-success/70 text-success-text";
    case "in_progress":
      return "bg-powder/40 text-powder-strong";
    case "pending_payment":
      return "bg-warning/70 text-warning-text";
    case "cancelled":
    case "expired":
      return "bg-danger/60 text-danger-text";
    default:
      return "bg-lilac-soft text-muted";
  }
}

function getPaymentStatusLabel(paymentStatus: string) {
  const labels: Record<string, string> = {
    unbilled: "Belum ditagih",
    ready_to_pay: "Siap dibayar",
    pending: "Menunggu bayar",
    paid: "Lunas",
    failed: "Gagal",
    cancelled: "Dibatalkan",
    expired: "Kedaluwarsa",
  };
  return labels[paymentStatus] ?? paymentStatus;
}

const errorMessages: Record<string, string> = {
  cancel_failed: "Pembatalan gagal. Status mungkin sudah berubah.",
  missing_booking: "Booking tidak ditemukan.",
  payment_missing_booking: "Booking untuk pembayaran tidak ditemukan.",
  payment_create_failed: "Transaksi Midtrans gagal dibuat.",
  payment_not_ready: "Booking belum siap dibayar.",
  payment_expired: "Waktu pembayaran sudah habis.",
  payment_missing_config: "Konfigurasi Midtrans belum tersedia.",
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

export default async function MyBookingsPage({ searchParams }: MyBookingsPageProps) {
  const { user, isEmailVerified } = await getCurrentAuthState();

  if (!user) redirect("/login?next=/my-bookings");
  if (!isEmailVerified) redirect(buildVerifyEmailPath(user.email, "/my-bookings"));

  const params = await searchParams;
  const { data: bookings, errorMessage } = await getMyBookings();
  const actionError = params.error ? errorMessages[params.error] : null;
  const paymentDetail = params.payment_error?.trim() || null;

  return (
    <SiteShell>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Pesanan"
          title="Pesanan saya"
          description="Pantau status layanan dan bayar saat invoice siap."
          actions={
            <Link href="/book" className="btn-primary">
              Booking baru
            </Link>
          }
        />

        {params.created === "1" ? (
          <StateCard
            tone="success"
            title="Booking tersimpan"
            description="Layanan sedang berjalan. Tagihan muncul di sini setelah admin menyelesaikan layanan."
          />
        ) : null}

        {params.cancelled === "1" ? (
          <StateCard title="Dibatalkan" description="Booking sudah dibatalkan." />
        ) : null}

        {params.payment === "pending" ? (
          <StateCard
            title="Menuju pembayaran"
            description="Selesaikan di Midtrans. Kalau tertutup, tekan bayar lagi."
          />
        ) : null}

        {actionError ? (
          <StateCard
            tone="warning"
            title="Aksi belum berhasil"
            description={paymentDetail ? `${actionError} ${paymentDetail}` : actionError}
          />
        ) : null}

        {errorMessage ? (
          <StateCard tone="warning" title="Gagal memuat" description={errorMessage} />
        ) : null}

        {bookings.length > 0 ? (
          <section className="grid gap-3">
            {bookings.map((booking) => (
              <article key={booking.id} className="surface-card rounded-[1.75rem] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold">
                        {booking.service?.name ?? "Layanan"}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusTone(booking.status)}`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      {booking.worker?.name ?? "Worker"} ·{" "}
                      {formatDateTimeRange(booking.start_at, booking.end_at)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      booking.payment_status === "ready_to_pay"
                        ? "bg-powder/50 text-powder-strong"
                        : booking.payment_status === "paid"
                          ? "bg-success/70 text-success-text"
                          : "bg-lilac-soft text-muted"
                    }`}
                  >
                    {getPaymentStatusLabel(booking.payment_status)}
                  </span>
                </div>

                {booking.notes ? (
                  <p className="mt-3 rounded-2xl bg-lilac-soft/70 px-3 py-2 text-sm text-muted">
                    {booking.notes}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {booking.canPay ? (
                    <form action={startMidtransPayment.bind(null, booking.id)}>
                      <button type="submit" className="btn-primary">
                        {booking.payment?.redirect_url ? "Lanjut bayar" : "Bayar sekarang"}
                      </button>
                    </form>
                  ) : null}

                  {booking.payment_status === "paid" ? (
                    <a href={`/api/bookings/${booking.id}/calendar`} className="btn-secondary">
                      Kalender
                    </a>
                  ) : null}

                  {booking.canCancel ? (
                    <form action={cancelBooking}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button
                        type="submit"
                        className="inline-flex h-11 items-center rounded-full border border-danger bg-danger/40 px-5 text-sm font-semibold text-danger-text"
                      >
                        Batalkan
                      </button>
                    </form>
                  ) : null}
                </div>

                {!booking.canPay && !booking.canCancel && booking.payment_status !== "paid" ? (
                  <p className="mt-4 text-sm text-muted">
                    {booking.status === "in_progress"
                      ? "Sedang dikerjakan. Tagihan muncul setelah admin menutup layanan."
                      : "Pesanan ini tidak bisa diubah."}
                  </p>
                ) : null}
              </article>
            ))}
          </section>
        ) : (
          <StateCard
            title="Belum ada pesanan"
            description="Mulai dari halaman Booking untuk membuat pesanan pertama."
          />
        )}
      </div>
    </SiteShell>
  );
}
