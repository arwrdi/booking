"use client";

import { useMemo, useState } from "react";

import type {
  PublicAvailabilitySlot,
  PublicService,
} from "@/infrastructure/supabase/publicData";

type BookingSelectionFormProps = {
  services: PublicService[];
  slots: PublicAvailabilitySlot[];
  selectedServiceId?: string;
  selectedSlotId?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSlotLabel(startAt: string, endAt: string) {
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

export function BookingSelectionForm({
  services,
  slots,
  selectedServiceId = "",
  selectedSlotId = "",
}: BookingSelectionFormProps) {
  const [serviceId, setServiceId] = useState(selectedServiceId);
  const [slotId, setSlotId] = useState(selectedSlotId);

  const visibleSlots = useMemo(() => {
    if (!serviceId) {
      return slots;
    }

    return slots.filter((slot) => slot.availableServiceIds.includes(serviceId));
  }, [serviceId, slots]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">1. Pilih layanan</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Layanan hanya bisa dipilih jika ada worker yang memang mendukung service tersebut.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {services.length > 0 ? (
            services.map((service) => (
              <label
                key={service.id}
                className="flex cursor-pointer items-start gap-3 rounded-3xl border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
              >
                <input
                  type="radio"
                  name="serviceId"
                  value={service.id}
                  checked={serviceId === service.id}
                  onChange={() => setServiceId(service.id)}
                  className="mt-1"
                />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{service.name}</p>
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      {service.duration_minutes} menit
                    </span>
                    <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:text-indigo-300">
                      {service.workers.length} worker
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {service.description ?? "Deskripsi layanan belum diisi."}
                  </p>
                  <p className="text-sm font-medium">{formatCurrency(service.price)}</p>
                  <div className="flex flex-wrap gap-2">
                    {service.workers.map((worker) => (
                      <span
                        key={`${service.id}-${worker.id}`}
                        className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        {worker.name}
                      </span>
                    ))}
                  </div>
                </div>
              </label>
            ))
          ) : null}
        </div>

        <div className="mt-6 rounded-3xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Setelah layanan dipilih, panel slot di kanan hanya menampilkan jadwal dari worker yang bisa mengerjakan layanan itu.
        </div>
      </section>

      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">2. Pilih slot</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Slot sekarang otomatis terfilter berdasarkan relasi service dan worker.
          </p>
        </div>

        <div className="mt-5 max-h-[32rem] space-y-3 overflow-y-auto pr-1">
          {visibleSlots.length > 0 ? (
            visibleSlots.map((slot) => (
              <label
                key={slot.id}
                className="flex cursor-pointer items-start gap-3 rounded-3xl border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
              >
                <input
                  type="radio"
                  name="slotId"
                  value={slot.id}
                  checked={slotId === slot.id}
                  onChange={() => setSlotId(slot.id)}
                  className="mt-1"
                />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {slot.worker?.name ?? "Worker tidak ditemukan"}
                    </p>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:text-emerald-300">
                      Tersedia
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {slot.worker?.specialization ?? "Spesialisasi belum diisi"}
                  </p>
                  <p className="text-sm font-medium">
                    {formatSlotLabel(slot.start_at, slot.end_at)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {slot.services.map((service) => (
                      <span
                        key={`${slot.id}-${service.id}`}
                        className={`rounded-full px-3 py-1 text-xs ${
                          serviceId === service.id
                            ? "bg-indigo-500/10 text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:text-indigo-300"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        {service.name}
                      </span>
                    ))}
                  </div>
                </div>
              </label>
            ))
          ) : (
            <div className="rounded-3xl border border-zinc-200 p-5 text-sm leading-6 text-zinc-600 shadow-sm dark:border-zinc-800 dark:text-zinc-400">
              {serviceId
                ? "Belum ada slot yang cocok untuk layanan ini. Coba pilih service lain."
                : "Belum ada slot tersedia untuk layanan yang aktif."}
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="text-sm font-medium">Catatan tambahan</span>
            <textarea
              name="notes"
              rows={4}
              placeholder="Contoh: lebih nyaman jam siang atau ada preferensi tertentu."
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
            />
          </label>

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Simpan booking
          </button>
        </div>
      </section>
    </div>
  );
}
