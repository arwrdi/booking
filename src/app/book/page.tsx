import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BookingSelectionForm } from "@/components/booking/booking-selection-form";
import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { getCurrentUser } from "@/infrastructure/supabase/auth";
import { getPublicAvailabilitySlots, getPublicServices } from "@/infrastructure/supabase/publicData";

import { createBooking } from "./actions";

export const metadata: Metadata = {
  title: "Book",
  description: "Buat booking pertama untuk user yang sudah login.",
};

const errorMessages: Record<string, string> = {
  missing_fields: "Pilih layanan dan slot terlebih dulu sebelum melanjutkan booking.",
  profile_missing:
    "Profil user belum ditemukan di tabel `profiles`. Pastikan trigger auth profile sudah dijalankan.",
  service_missing: "Layanan yang dipilih tidak valid atau sudah tidak aktif.",
  slot_missing: "Slot yang dipilih tidak ditemukan. Coba refresh daftar slot lalu pilih ulang.",
  slot_unavailable: "Slot ini sudah tidak tersedia lagi.",
  service_not_supported:
    "Worker pada slot ini tidak mendukung layanan yang kamu pilih. Pilih kombinasi service dan slot yang sesuai.",
  slot_invalid: "Data waktu pada slot tidak valid.",
  slot_taken: "Slot baru saja diambil user lain. Pilih slot yang lain.",
  relation_missing:
    "Relasi worker dan service belum tersedia. Jalankan migration `005_worker_service_relations.sql` lalu seed ulang.",
  insert_failed: "Booking gagal disimpan. Coba lagi sebentar lagi.",
};

type BookPageProps = {
  searchParams: Promise<{
    serviceId?: string;
    slotId?: string;
    error?: string;
  }>;
};

export default async function BookPage({ searchParams }: BookPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/book");
  }

  const params = await searchParams;
  const selectedServiceId = params.serviceId ?? "";
  const selectedSlotId = params.slotId ?? "";
  const errorMessage = params.error ? errorMessages[params.error] : null;

  const [servicesResult, slotsResult] = await Promise.all([
    getPublicServices(),
    getPublicAvailabilitySlots(120),
  ]);

  const warnings = [servicesResult.errorMessage, slotsResult.errorMessage].filter(Boolean) as string[];

  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Booking Flow"
          title="Pilih layanan dan slot, lalu simpan booking pertama kamu."
          description="Flow ini masih versi MVP: user login memilih satu layanan, satu slot, lalu membuat booking dengan status `pending_payment`."
          actions={
            <Link
              href="/my-bookings"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Lihat booking saya
            </Link>
          }
        />

        {errorMessage ? (
          <StateCard
            tone="warning"
            title="Booking belum berhasil"
            description={errorMessage}
          />
        ) : null}

        {warnings.length > 0 ? (
          <StateCard
            tone="warning"
            title="Data booking belum lengkap"
            description={warnings.join(" ")}
          />
        ) : null}

        <form action={createBooking}>
          <BookingSelectionForm
            services={servicesResult.data}
            slots={slotsResult.data}
            selectedServiceId={selectedServiceId}
            selectedSlotId={selectedSlotId}
          />
        </form>
      </div>
    </SiteShell>
  );
}
