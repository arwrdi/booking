import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { getPublicAvailabilitySlots } from "@/infrastructure/supabase/publicData";

export const metadata: Metadata = {
  title: "Availability",
  description: "Slot ketersediaan worker untuk booking MVP.",
};

function formatDayLabel(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTimeRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  return `${start.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default async function AvailabilityPage() {
  const { data: slots, errorMessage } = await getPublicAvailabilitySlots(60);

  const groupedSlots = slots.reduce<Record<string, typeof slots>>((groups, slot) => {
    const key = new Date(slot.start_at).toISOString().slice(0, 10);
    groups[key] = [...(groups[key] ?? []), slot];
    return groups;
  }, {});

  const dayKeys = Object.keys(groupedSlots).sort((left, right) =>
    left.localeCompare(right),
  );

  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Availability"
          title="Slot ketersediaan publik yang siap dipakai untuk step pilih waktu."
          description="Untuk saat ini slot masih bersifat read-only. Nanti setelah auth dan flow booking aktif, halaman ini bisa dipecah menjadi selector per worker atau per service."
        />

        {errorMessage ? (
          <StateCard
            tone="warning"
            title="Slot belum bisa dimuat"
            description={errorMessage}
          />
        ) : null}

        {dayKeys.length > 0 ? (
          <section className="space-y-6">
            {dayKeys.map((dayKey) => (
              <div
                key={dayKey}
                className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                      Jadwal
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                      {formatDayLabel(groupedSlots[dayKey][0].start_at)}
                    </h2>
                  </div>
                  <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    {groupedSlots[dayKey].length} slot
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {groupedSlots[dayKey].map((slot) => (
                    <article
                      key={slot.id}
                      className="rounded-3xl border border-zinc-200 p-5 dark:border-zinc-800"
                    >
                      <p className="text-sm font-semibold">
                        {slot.worker?.name ?? "Worker tidak ditemukan"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {slot.worker?.specialization ?? "Spesialisasi belum diisi"}
                      </p>
                      <p className="mt-4 text-base font-semibold">
                        {formatTimeRange(slot.start_at, slot.end_at)}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                        Tersedia
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {slot.services.map((service) => (
                          <span
                            key={`${slot.id}-${service.id}`}
                            className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                          >
                            {service.name}
                          </span>
                        ))}
                      </div>
                      <Link
                        href={`/book?slotId=${slot.id}`}
                        className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                      >
                        Booking slot ini
                      </Link>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ) : (
          <StateCard
            title="Belum ada slot tersedia"
            description="Jalankan seed dummy agar halaman ini menampilkan slot 7 hari ke depan."
          />
        )}
      </div>
    </SiteShell>
  );
}
