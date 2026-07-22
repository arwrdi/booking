import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { getPublicAvailabilitySlots } from "@/infrastructure/supabase/publicData";

export const metadata: Metadata = {
  title: "Jadwal",
  description: "Slot ketersediaan worker.",
};

function formatDayLabel(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTimeRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return `${start.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })} – ${end.toLocaleTimeString("id-ID", {
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

  const dayKeys = Object.keys(groupedSlots).sort((a, b) => a.localeCompare(b));

  return (
    <SiteShell>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Jadwal"
          title="Slot tersedia"
          description="Lihat jadwal terdekat, lalu booking dari halaman Booking."
          actions={
            <Link href="/book" className="btn-primary">
              Mulai booking
            </Link>
          }
        />

        {errorMessage ? (
          <StateCard tone="warning" title="Gagal memuat" description={errorMessage} />
        ) : null}

        {dayKeys.length > 0 ? (
          <section className="space-y-4">
            {dayKeys.map((dayKey) => (
              <div key={dayKey} className="surface-card rounded-[1.75rem] p-5">
                <h2 className="font-display text-xl font-semibold">
                  {formatDayLabel(groupedSlots[dayKey][0].start_at)}
                </h2>
                <div className="mt-3 space-y-2">
                  {groupedSlots[dayKey].map((slot) => (
                    <div
                      key={slot.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {slot.worker?.name ?? "Worker"}
                        </p>
                        <p className="text-xs text-muted">
                          {formatTimeRange(slot.start_at, slot.end_at)}
                        </p>
                      </div>
                      <Link href={`/book?slotId=${slot.id}`} className="btn-secondary h-9 px-3 text-xs">
                        Pilih
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ) : (
          <StateCard title="Belum ada slot" description="Seed data availability di Supabase." />
        )}
      </div>
    </SiteShell>
  );
}
