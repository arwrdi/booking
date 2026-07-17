import Link from "next/link";

import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import {
  getPublicAvailabilitySlots,
  getPublicServices,
  getPublicWorkers,
} from "@/infrastructure/supabase/publicData";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSlotRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  return `${start.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })} • ${start.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default async function Home() {
  const [servicesResult, workersResult, availabilityResult] = await Promise.all([
    getPublicServices(),
    getPublicWorkers(),
    getPublicAvailabilitySlots(6),
  ]);

  const warnings = [
    servicesResult.errorMessage,
    workersResult.errorMessage,
    availabilityResult.errorMessage,
  ].filter(Boolean) as string[];

  const featuredServices = servicesResult.data.slice(0, 3);
  const nextSlots = availabilityResult.data.slice(0, 4);

  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Booking MVP"
          title="Mulai dari katalog layanan, worker aktif, dan slot yang siap dibooking."
          description="Halaman publik ini sudah tersambung ke Supabase sehingga kamu bisa memvalidasi schema, RLS publik, dan data dummy sebelum menambahkan login Google dan flow booking penuh."
          actions={
            <>
              <Link
                href="/services"
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Lihat layanan
              </Link>
              <Link
                href="/availability"
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Cek slot terdekat
              </Link>
            </>
          }
        />

        {warnings.length > 0 ? (
          <StateCard
            tone="warning"
            title="Masih ada query yang perlu dibereskan"
            description={warnings.join(" ")}
          />
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <StateCard
            title={`${servicesResult.data.length} layanan aktif`}
            description="Dipakai sebagai katalog publik sebelum user login dan mulai memilih treatment."
          />
          <StateCard
            title={`${workersResult.data.length} worker aktif`}
            description="Bisa langsung dipakai untuk halaman pemilihan worker pada step booking berikutnya."
          />
          <StateCard
            title={`${availabilityResult.data.length} slot terdekat`}
            description="Slot diambil dari Supabase dan hanya menampilkan jadwal yang masih tersedia."
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Featured Services</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Data diambil langsung dari tabel `services`.
                </p>
              </div>
              <Link href="/services" className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                Lihat semua
              </Link>
            </div>

            <div className="mt-5 grid gap-4">
              {featuredServices.length > 0 ? (
                featuredServices.map((service) => (
                  <article
                    key={service.id}
                    className="rounded-3xl border border-zinc-200 p-5 dark:border-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                          {service.category ?? "General"}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold">{service.name}</h3>
                      </div>
                      <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        {service.duration_minutes} menit
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {service.description ?? "Deskripsi layanan belum diisi."}
                    </p>
                    <p className="mt-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                      {formatCurrency(service.price)}
                    </p>
                  </article>
                ))
              ) : (
                <StateCard
                  title="Belum ada layanan"
                  description="Jalankan seed dummy atau tambahkan data baru di Supabase Table Editor."
                />
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Slot Terdekat</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Cocok untuk sanity check sebelum bikin flow checkout.
                </p>
              </div>
              <Link href="/availability" className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                Buka kalender
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {nextSlots.length > 0 ? (
                nextSlots.map((slot) => (
                  <article
                    key={slot.id}
                    className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <p className="text-sm font-semibold">
                      {slot.worker?.name ?? "Worker tidak ditemukan"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {slot.worker?.specialization ?? "Spesialisasi belum diisi"}
                    </p>
                    <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {formatSlotRange(slot.start_at, slot.end_at)}
                    </p>
                  </article>
                ))
              ) : (
                <StateCard
                  title="Belum ada slot"
                  description="Setelah seed dijalankan, slot 7 hari ke depan akan tampil di sini."
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
