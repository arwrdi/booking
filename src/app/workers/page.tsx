import type { Metadata } from "next";
import Link from "next/link";

import { WorkerCard } from "@/components/booking/worker-card";
import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import {
  getPublicAvailabilitySlots,
  getPublicWorkers,
} from "@/infrastructure/supabase/publicData";
import { getSupabaseServerClient } from "@/infrastructure/supabase/serverClient";

export const metadata: Metadata = {
  title: "Worker",
  description: "Daftar worker aktif.",
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

  const workerIds = workersResult.data.map((w) => w.id);
  const supabase = await getSupabaseServerClient();
  const { data: extras } =
    workerIds.length > 0
      ? await supabase.from("workers").select("id, bio, portfolio_urls").in("id", workerIds)
      : { data: [] as { id: string; bio: string | null; portfolio_urls: string[] }[] };

  const extraMap = new Map(
    ((extras ?? []) as { id: string; bio: string | null; portfolio_urls: string[] }[]).map(
      (w) => [w.id, w],
    ),
  );

  return (
    <SiteShell>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Worker"
          title="Kenali worker kami"
          description="Lihat profil dan portofolio, lalu booking dari halaman Booking."
          actions={
            <Link href="/book" className="btn-primary">
              Mulai booking
            </Link>
          }
        />

        {warnings.length > 0 ? (
          <StateCard tone="warning" title="Data belum ideal" description={warnings.join(" ")} />
        ) : null}

        {workersResult.data.length > 0 ? (
          <section className="grid grid-cols-2 gap-x-3 gap-y-2 sm:gap-x-4 md:grid-cols-3">
            {workersResult.data.map((worker) => {
              const extra = extraMap.get(worker.id);
              return (
                <WorkerCard
                  key={worker.id}
                  name={worker.name}
                  specialization={worker.specialization}
                  bio={extra?.bio}
                  photoUrl={worker.photo_url}
                  portfolioUrls={extra?.portfolio_urls ?? []}
                  selectable={false}
                  footerNote={`${slotCountByWorker[worker.id] ?? 0} slot`}
                />
              );
            })}
          </section>
        ) : (
          <StateCard title="Belum ada worker" description="Isi tabel workers di Supabase." />
        )}
      </div>
    </SiteShell>
  );
}
