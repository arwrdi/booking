import type { Metadata } from "next";

import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import {
  getPublicAvailabilitySlots,
  getPublicWorkers,
} from "@/infrastructure/supabase/publicData";

export const metadata: Metadata = {
  title: "Workers",
  description: "Daftar worker aktif untuk booking MVP.",
};

export default async function WorkersPage() {
  const [workersResult, availabilityResult] = await Promise.all([
    getPublicWorkers(),
    getPublicAvailabilitySlots(200),
  ]);

  const warnings = [workersResult.errorMessage, availabilityResult.errorMessage].filter(
    Boolean,
  ) as string[];

  const slotCountByWorker = availabilityResult.data.reduce<Record<string, number>>(
    (counts, slot) => {
      if (slot.worker) {
        counts[slot.worker.id] = (counts[slot.worker.id] ?? 0) + 1;
      }

      return counts;
    },
    {},
  );

  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Workers"
          title="Daftar worker aktif beserta kapasitas slot yang sudah di-seed."
          description="Ini membantu kamu menguji pemetaan worker ke availability sebelum nanti dipakai di step pilih worker dan pilih slot."
        />

        {warnings.length > 0 ? (
          <StateCard
            tone="warning"
            title="Masih ada query yang belum ideal"
            description={warnings.join(" ")}
          />
        ) : null}

        {workersResult.data.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workersResult.data.map((worker) => (
              <article
                key={worker.id}
                className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                      Worker aktif
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight">
                      {worker.name}
                    </h2>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:text-emerald-300">
                    Online
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {worker.specialization ?? "Spesialisasi belum diisi."}
                </p>

                <div className="mt-6 rounded-3xl bg-zinc-100 p-4 dark:bg-zinc-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                    Slot 7 hari ke depan
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {slotCountByWorker[worker.id] ?? 0}
                  </p>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <StateCard
            title="Belum ada worker aktif"
            description="Isi tabel `workers` atau jalankan seed dummy agar halaman pemilihan worker bisa kamu uji."
          />
        )}
      </div>
    </SiteShell>
  );
}
