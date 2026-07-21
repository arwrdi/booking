import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { getCurrentAdminProfile, getCurrentAuthState } from "@/infrastructure/supabase/auth";
import { getAdminBookings } from "@/infrastructure/supabase/adminData";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Pemantauan order masuk dan ringkasan penjualan harian.",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDashboardPage() {
  const { user } = await getCurrentAuthState();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const admin = await getCurrentAdminProfile();

  if (!admin) {
    redirect("/");
  }

  const { data: bookings, errorMessage, stats } = await getAdminBookings();

  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Admin"
          title="Pantau order masuk dan ringkasan performa harian."
          description="Dashboard read-only untuk owner. Tidak ada input booking manual di sini — semua order datang dari pelanggan yang bayar online."
          actions={
            <Link
              href="/my-bookings"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Ke my bookings
            </Link>
          }
        />

        {errorMessage ? (
          <StateCard
            tone="warning"
            title="Data admin belum bisa dimuat"
            description={errorMessage}
          />
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StateCard
            title={`${stats.totalBookings} order terbaru`}
            description="Menampilkan hingga 50 booking terakhir untuk monitoring cepat."
          />
          <StateCard
            title={`${stats.pendingPayment} siap tagih`}
            description="Booking berstatus ready_to_pay yang perlu dibayar pelanggan."
          />
          <StateCard
            title={formatCurrency(stats.revenueToday)}
            description="Revenue hari ini dari booking berstatus paid."
          />
          <StateCard
            title={`${stats.paidBookings} sudah dibayar`}
            description={`Terlaris: ${stats.topService}. Worker aktif: ${stats.topWorker}.`}
          />
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Order masuk</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Login sebagai {admin.email ?? "admin"} · role `{admin.role}`
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                  <article
                  key={booking.id}
                  className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-semibold">
                        {booking.serviceName ?? "Layanan tidak ditemukan"}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {booking.customerName ?? "Pelanggan"}
                        {booking.customerEmail ? ` · ${booking.customerEmail}` : ""}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Worker: {booking.workerName ?? "-"} · {formatDateTime(booking.start_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 text-sm md:items-end">
                      <div className="space-y-1 md:text-right">
                        <p className="font-medium">{booking.status}</p>
                        <p className="text-zinc-600 dark:text-zinc-400">
                          Payment: {booking.payment_status}
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400">
                          {typeof booking.servicePrice === "number"
                            ? formatCurrency(booking.servicePrice)
                            : "-"}
                        </p>
                      </div>
                      <Link
                        href={`/admin/booking/${booking.id}`}
                        className="inline-flex h-8 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        Kelola →
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <StateCard
                title="Belum ada order"
                description="Order akan muncul di sini setelah pelanggan membuat booking."
              />
            )}
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
