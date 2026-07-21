import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { getCurrentAdminProfile, getCurrentAuthState } from "@/infrastructure/supabase/auth";
import { getAdminBookingDetail } from "@/infrastructure/supabase/adminData";
import { getPublicServices } from "@/infrastructure/supabase/publicData";
import { addInvoiceItem, cancelBookingAdmin, markBookingCompleted } from "../../actions";

export const metadata: Metadata = {
  title: "Detail Booking – Admin",
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

type PageProps = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ result?: string }>;
};

const resultMessages: Record<string, { tone: "success" | "warning"; text: string }> = {
  item_added: { tone: "success", text: "Layanan tambahan berhasil ditambahkan ke invoice." },
  service_completed: { tone: "success", text: "Layanan ditandai selesai. Invoice siap dibayar oleh pelanggan." },
  booking_cancelled: { tone: "warning", text: "Booking berhasil dibatalkan." },
  missing_fields: { tone: "warning", text: "Isi semua field sebelum mengirim." },
  booking_not_active: { tone: "warning", text: "Booking ini sudah tidak aktif." },
  no_invoice_items: { tone: "warning", text: "Tidak ada item invoice. Tambahkan layanan dulu." },
};

export default async function AdminBookingDetailPage({ params, searchParams }: PageProps) {
  const { user } = await getCurrentAuthState();
  if (!user) redirect("/login?next=/admin");

  const admin = await getCurrentAdminProfile();
  if (!admin) redirect("/");

  const { bookingId } = await params;
  const { result } = await searchParams;

  const [{ data: booking, errorMessage }, { data: services }] = await Promise.all([
    getAdminBookingDetail(bookingId),
    getPublicServices(),
  ]);

  const resultFeedback = result ? (resultMessages[result] ?? { tone: "warning" as const, text: result }) : null;
  const isActive = booking && ["in_progress", "confirmed"].includes(booking.status);

  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Admin › Detail Booking"
          title={booking ? `Booking ${booking.id.slice(0, 8)}…` : "Detail Booking"}
          description="Kelola invoice dan status layanan untuk booking ini."
          actions={
            <a
              href="/admin"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              ← Kembali
            </a>
          }
        />

        {resultFeedback ? (
          <StateCard tone={resultFeedback.tone} title={resultFeedback.text} description="" />
        ) : null}

        {errorMessage ? (
          <StateCard tone="warning" title="Error" description={errorMessage} />
        ) : null}

        {!booking ? (
          <StateCard title="Booking tidak ditemukan" description="ID booking tidak valid." />
        ) : (
          <>
            {/* Info booking */}
            <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-xl font-semibold tracking-tight">Informasi Booking</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Pelanggan</dt>
                  <dd className="mt-1 font-medium">{booking.customerName ?? "-"}</dd>
                  <dd className="text-sm text-zinc-500">{booking.customerEmail ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Worker</dt>
                  <dd className="mt-1 font-medium">{booking.workerName ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Layanan awal</dt>
                  <dd className="mt-1 font-medium">{booking.serviceName ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Waktu</dt>
                  <dd className="mt-1 font-medium">{formatDateTime(booking.start_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Status</dt>
                  <dd className="mt-1">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium dark:bg-zinc-800">
                      {booking.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-500">Status Pembayaran</dt>
                  <dd className="mt-1">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        booking.payment_status === "paid"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : booking.payment_status === "ready_to_pay"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-zinc-100 dark:bg-zinc-800"
                      }`}
                    >
                      {booking.payment_status}
                    </span>
                  </dd>
                </div>
                {booking.notes ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-zinc-500">Catatan</dt>
                    <dd className="mt-1 text-sm">{booking.notes}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            {/* Invoice Items */}
            <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-xl font-semibold tracking-tight">Invoice</h2>
              <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                {booking.invoiceItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">{item.service_name}</p>
                      <p className="text-sm text-zinc-500">
                        {item.qty}× {formatCurrency(item.price)}
                        {item.added_by_admin ? (
                          <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                            ditambah admin
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.price * item.qty)}</p>
                  </div>
                ))}
                {booking.invoiceItems.length === 0 ? (
                  <p className="py-3 text-sm text-zinc-500">Belum ada item invoice.</p>
                ) : null}
              </div>
              <div className="mt-4 flex justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <p className="font-semibold">Total</p>
                <p className="text-lg font-bold">{formatCurrency(booking.invoiceTotal)}</p>
              </div>
            </section>

            {/* Admin Actions */}
            {isActive ? (
              <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="text-xl font-semibold tracking-tight">Aksi Admin</h2>

                {/* Tambah layanan */}
                <div className="mt-5 rounded-3xl border border-zinc-100 p-4 dark:border-zinc-800">
                  <h3 className="text-sm font-semibold">Tambah layanan ke invoice</h3>
                  <form action={addInvoiceItem} className="mt-3 flex flex-wrap items-end gap-3">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <div>
                      <label className="mb-1 block text-xs font-medium">Layanan</label>
                      <select
                        name="serviceId"
                        required
                        className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <option value="">Pilih layanan…</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} – {formatCurrency(s.price)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Qty</label>
                      <input
                        type="number"
                        name="qty"
                        defaultValue={1}
                        min={1}
                        max={99}
                        className="w-20 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                      Tambah
                    </button>
                  </form>
                </div>

                {/* Mark selesai */}
                <div className="mt-4 rounded-3xl border border-zinc-100 p-4 dark:border-zinc-800">
                  <h3 className="text-sm font-semibold">Tutup layanan & minta pembayaran</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Setelah diklik, status booking menjadi <strong>completed</strong> dan invoice
                    dikirim ke pelanggan untuk dibayar.
                  </p>
                  <form action={markBookingCompleted} className="mt-3">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Tandai Selesai & Tagih
                    </button>
                  </form>
                </div>

                {/* Cancel */}
                <div className="mt-4 rounded-3xl border border-red-100 p-4 dark:border-red-900/30">
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
                    Batalkan booking
                  </h3>
                  <form action={cancelBookingAdmin} className="mt-3">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center justify-center rounded-full border border-red-300 bg-white px-5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Batalkan Booking
                    </button>
                  </form>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </SiteShell>
  );
}
