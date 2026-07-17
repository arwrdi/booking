import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { getCurrentUser } from "@/infrastructure/supabase/auth";
import { getMyBookings } from "@/infrastructure/supabase/bookingData";

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
      return "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300";
    case "pending_payment":
      return "bg-amber-500/10 text-amber-700 ring-amber-600/20 dark:text-amber-300";
    case "cancelled":
    case "expired":
      return "bg-rose-500/10 text-rose-700 ring-rose-600/20 dark:text-rose-300";
    default:
      return "bg-zinc-500/10 text-zinc-700 ring-zinc-600/20 dark:text-zinc-300";
  }
}

type MyBookingsPageProps = {
  searchParams: Promise<{
    created?: string;
  }>;
};

export default async function MyBookingsPage({
  searchParams,
}: MyBookingsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/my-bookings");
  }

  const params = await searchParams;
  const { data: bookings, errorMessage } = await getMyBookings();

  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="My Bookings"
          title="Pantau booking yang sudah kamu buat dari akun Google ini."
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
            description="Booking baru sudah masuk dengan status `pending_payment` dan akan muncul di daftar di bawah."
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
                    <p>Payment: {booking.payment_status}</p>
                    <p>{formatCurrency(booking.service?.price)}</p>
                    {booking.held_until ? (
                      <p>
                        Hold sampai{" "}
                        {new Date(booking.held_until).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>

                {booking.notes ? (
                  <div className="mt-5 rounded-3xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    <p className="font-medium">Catatan</p>
                    <p className="mt-2">{booking.notes}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        ) : (
          <StateCard
            title="Belum ada booking"
            description="Mulai dari halaman booking untuk membuat transaksi pertama dengan akun Google yang sedang aktif."
          />
        )}
      </div>
    </SiteShell>
  );
}
