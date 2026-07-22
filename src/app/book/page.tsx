import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BookingSelectionForm } from "@/components/booking/booking-selection-form";
import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { buildVerifyEmailPath, getCurrentAuthState } from "@/infrastructure/supabase/auth";
import { getPublicServices } from "@/infrastructure/supabase/publicData";

import { createBooking } from "./actions";

export const metadata: Metadata = {
  title: "Booking",
  description: "Buat booking baru.",
};

const errorMessages: Record<string, string> = {
  missing_fields: "Pilih layanan dan slot dulu ya.",
  profile_missing: "Profil belum siap. Coba login ulang.",
  service_missing: "Layanan tidak valid atau tidak aktif.",
  slot_missing: "Slot tidak ditemukan. Refresh lalu pilih ulang.",
  slot_unavailable: "Slot sudah tidak tersedia.",
  service_not_supported: "Worker ini tidak mendukung layanan tersebut.",
  slot_invalid: "Data waktu slot tidak valid.",
  slot_taken: "Slot baru saja diambil. Pilih yang lain.",
  relation_missing: "Relasi worker–layanan belum siap di database.",
  insert_failed: "Booking gagal disimpan. Coba lagi.",
  booking_function_missing: "Function booking belum ada di database.",
  unauthorized: "Session tidak valid. Login ulang.",
};

type BookPageProps = {
  searchParams: Promise<{
    serviceId?: string;
    slotId?: string;
    error?: string;
  }>;
};

export default async function BookPage({ searchParams }: BookPageProps) {
  const { user, isEmailVerified } = await getCurrentAuthState();

  if (!user) {
    redirect("/login?next=/book");
  }

  if (!isEmailVerified) {
    redirect(buildVerifyEmailPath(user.email, "/book"));
  }

  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : null;
  const servicesResult = await getPublicServices();
  const warnings = [servicesResult.errorMessage].filter(Boolean) as string[];

  return (
    <SiteShell>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Booking"
          title="Pesan dalam beberapa tap"
          description="Layanan → worker → jadwal. Pembayaran setelah layanan selesai."
          actions={
            <Link href="/my-bookings" className="btn-secondary">
              Pesanan saya
            </Link>
          }
        />

        {errorMessage ? (
          <StateCard tone="warning" title="Belum berhasil" description={errorMessage} />
        ) : null}

        {warnings.length > 0 ? (
          <StateCard tone="warning" title="Data belum lengkap" description={warnings.join(" ")} />
        ) : null}

        <form action={createBooking}>
          <BookingSelectionForm
            services={servicesResult.data}
            selectedServiceId={params.serviceId ?? ""}
            selectedSlotId={params.slotId ?? ""}
          />
        </form>
      </div>
    </SiteShell>
  );
}
