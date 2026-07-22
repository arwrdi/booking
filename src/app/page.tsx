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

export default async function Home() {
  const [servicesResult, workersResult, availabilityResult] = await Promise.all([
    getPublicServices(),
    getPublicWorkers(),
    getPublicAvailabilitySlots(4),
  ]);

  const warnings = [
    servicesResult.errorMessage,
    workersResult.errorMessage,
    availabilityResult.errorMessage,
  ].filter(Boolean) as string[];

  const featuredServices = servicesResult.data.slice(0, 3);

  return (
    <SiteShell>
      <div className="space-y-10">
        <PageIntro
          hero
          eyebrow="Dyvara"
          title="Beauty Studio, tanpa ribet."
          description="Pilih layanan, pilih worker, pilih jadwal — selesai dalam beberapa tap. Bayar setelah layanan selesai."
          actions={
            <Link href="/book" className="btn-primary">
              Mulai booking
            </Link>
          }
        />

        {warnings.length > 0 ? (
          <StateCard
            tone="warning"
            title="Data belum lengkap"
            description={warnings.join(" ")}
          />
        ) : null}

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">Layanan populer</h2>
            <Link href="/services" className="text-sm font-semibold text-powder-strong">
              Semua
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredServices.length > 0 ? (
              featuredServices.map((service) => (
                <article
                  key={service.id}
                  className="surface-card flex flex-col rounded-[1.75rem] p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {service.category ?? "Layanan"}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-semibold">{service.name}</h3>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">
                    {service.description ?? "Siap dibooking."}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-powder-strong">
                      {formatCurrency(service.price)}
                    </p>
                    <Link
                      href={`/book?serviceId=${service.id}`}
                      className="btn-secondary h-10 px-4 text-xs"
                    >
                      Booking
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <StateCard title="Belum ada layanan" description="Tambahkan data di Supabase." />
            )}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <StateCard
            title={`${servicesResult.data.length} layanan`}
            description="Pilih yang paling cocok untukmu."
          />
          <StateCard
            title={`${workersResult.data.length} worker`}
            description="Lihat profil dan portofolio."
          />
          <StateCard
            title={`${availabilityResult.data.length}+ slot`}
            description="Jadwal terdekat siap dipilih."
          />
        </section>
      </div>
    </SiteShell>
  );
}
