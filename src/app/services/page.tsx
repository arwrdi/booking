import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { getPublicServices } from "@/infrastructure/supabase/publicData";

export const metadata: Metadata = {
  title: "Layanan",
  description: "Katalog layanan.",
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
      <div className="space-y-6">
        <PageIntro
          eyebrow="Layanan"
          title="Pilih layanan favoritmu"
          description="Tap Booking untuk langsung mulai dengan layanan ini."
        />

        {errorMessage ? (
          <StateCard tone="warning" title="Gagal memuat" description={errorMessage} />
        ) : null}

        {services.length > 0 ? (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article key={service.id} className="surface-card flex flex-col rounded-[1.75rem] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-powder-strong">
                  {service.category ?? "Layanan"}
                </p>
                <h2 className="mt-2 font-display text-xl font-semibold">{service.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted">
                  {service.description ?? "Siap dibooking."}
                </p>
                <p className="mt-3 text-xs text-muted">{service.duration_minutes} menit</p>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="font-semibold text-powder-strong">
                    {formatCurrency(service.price)}
                  </p>
                  <Link href={`/book?serviceId=${service.id}`} className="btn-primary h-10 px-4 text-xs">
                    Booking
                  </Link>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <StateCard title="Belum ada layanan" description="Isi tabel services di Supabase." />
        )}
      </div>
    </SiteShell>
  );
}
