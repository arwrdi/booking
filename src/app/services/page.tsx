import type { Metadata } from "next";

import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { getPublicServices } from "@/infrastructure/supabase/publicData";

export const metadata: Metadata = {
  title: "Services",
  description: "Katalog layanan publik untuk booking MVP.",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function ServicesPage() {
  const { data: services, errorMessage } = await getPublicServices();

  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Catalog"
          title="Katalog layanan publik untuk langkah pertama booking."
          description="Halaman ini sengaja dibuat tanpa auth agar kamu bisa langsung menguji data katalog, harga, durasi, dan kesiapan RLS publik."
        />

        {errorMessage ? (
          <StateCard
            tone="warning"
            title="Layanan belum bisa dimuat"
            description={errorMessage}
          />
        ) : null}

        {services.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.id}
                className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                      {service.category ?? "General"}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight">
                      {service.name}
                    </h2>
                  </div>
                  <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    {service.duration_minutes} menit
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {service.description ?? "Deskripsi layanan belum diisi."}
                </p>

                <div className="mt-6 flex items-center justify-between gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                  <p className="text-lg font-semibold">{formatCurrency(service.price)}</p>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:text-emerald-300">
                    Aktif
                  </span>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <StateCard
            title="Belum ada data layanan"
            description="Jalankan file seed dummy atau isi tabel `services` di Supabase agar katalog bisa tampil."
          />
        )}
      </div>
    </SiteShell>
  );
}
