"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { WorkerCard } from "@/components/booking/worker-card";
import type {
  PublicAvailabilitySlot,
  PublicService,
  WorkerWithPortfolio,
} from "@/infrastructure/supabase/publicData";

type BookingSelectionFormProps = {
  services: PublicService[];
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

function formatSlotTime(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const time = (d: Date) =>
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${time(start)} – ${time(end)}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function BookingSelectionForm({
  services,
  selectedServiceId = "",
  selectedSlotId = "",
}: BookingSelectionFormProps) {
  const [serviceId, setServiceId] = useState(selectedServiceId);
  const [workerId, setWorkerId] = useState("");
  const [slotId, setSlotId] = useState(selectedSlotId);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [notes, setNotes] = useState("");

  const [workers, setWorkers] = useState<WorkerWithPortfolio[]>([]);
  const [slots, setSlots] = useState<PublicAvailabilitySlot[]>([]);
  const [loadingWorkers, startLoadWorkers] = useTransition();
  const [loadingSlots, startLoadSlots] = useTransition();
  const [fetchError, setFetchError] = useState<string | null>(null);

  const workersRef = useRef<HTMLElement | null>(null);
  const slotsRef = useRef<HTMLElement | null>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );
  const selectedWorker = useMemo(
    () => workers.find((w) => w.id === workerId) ?? null,
    [workers, workerId],
  );

  const loadSlots = useCallback((wId: string, date: string) => {
    setFetchError(null);
    startLoadSlots(async () => {
      const res = await fetch(
        `/api/booking/slots-for-worker?workerId=${encodeURIComponent(wId)}&date=${encodeURIComponent(date)}`,
      );
      if (!res.ok) {
        setFetchError("Gagal memuat slot. Coba lagi.");
        return;
      }
      const json = (await res.json()) as {
        data: PublicAvailabilitySlot[];
        error: string | null;
      };
      setSlots(json.data ?? []);
    });
  }, []);

  const handleSelectService = useCallback((id: string) => {
    setServiceId(id);
    setWorkerId("");
    setSlotId("");
    setSlots([]);
    setFetchError(null);

    startLoadWorkers(async () => {
      const res = await fetch(
        `/api/booking/workers-for-service?serviceId=${encodeURIComponent(id)}`,
      );
      if (!res.ok) {
        setFetchError("Gagal memuat worker. Coba refresh.");
        return;
      }
      const json = (await res.json()) as {
        data: WorkerWithPortfolio[];
        error: string | null;
      };
      setWorkers(json.data ?? []);
      requestAnimationFrame(() => {
        workersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }, []);

  const handleSelectWorker = useCallback(
    (id: string) => {
      setWorkerId(id);
      setSlotId("");
      loadSlots(id, selectedDate);
      requestAnimationFrame(() => {
        slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [loadSlots, selectedDate],
  );

  const handleDateChange = useCallback(
    (date: string) => {
      setSelectedDate(date);
      setSlotId("");
      if (workerId) {
        loadSlots(workerId, date);
      }
    },
    [loadSlots, workerId],
  );

  useEffect(() => {
    if (selectedServiceId && !workers.length) {
      handleSelectService(selectedServiceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableSlots = useMemo(
    () =>
      slots.filter(
        (s) => s.availableServiceIds.includes(serviceId) && s.is_available,
      ),
    [slots, serviceId],
  );

  const canSubmit = Boolean(serviceId && slotId);

  return (
    <div className="space-y-8 pb-28">
      {fetchError ? (
        <div className="rounded-3xl border border-warning bg-warning/50 p-4 text-sm text-warning-text">
          {fetchError}
        </div>
      ) : null}

      {/* 1. Layanan */}
      <section className="surface-card rounded-[1.75rem] p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold">Pilih layanan</h2>
        <p className="mt-1 text-sm text-muted">Tap sekali, worker muncul otomatis di bawah.</p>
        <div className="mt-4 space-y-3">
          {services.map((service) => {
            const selected = serviceId === service.id;
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => handleSelectService(service.id)}
                className={`w-full rounded-3xl border p-4 text-left transition-colors ${
                  selected
                    ? "border-powder-strong bg-lilac-soft ring-2 ring-powder-strong/40"
                    : "border-border bg-surface hover:border-powder"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{service.name}</p>
                  <span className="rounded-full bg-lilac-soft px-2 py-0.5 text-xs text-muted">
                    {service.duration_minutes} mnt
                  </span>
                </div>
                {service.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{service.description}</p>
                ) : null}
                <p className="mt-2 text-sm font-semibold text-powder-strong">
                  {formatCurrency(service.price)}
                </p>
              </button>
            );
          })}
          {services.length === 0 ? (
            <p className="text-sm text-muted">Belum ada layanan aktif.</p>
          ) : null}
        </div>
        {loadingWorkers ? <p className="mt-3 text-sm text-muted">Memuat worker…</p> : null}
      </section>

      {/* 2. Worker — progressive reveal */}
      {serviceId ? (
        <section ref={workersRef} className="scroll-mt-24">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Pilih worker</h2>
              <p className="mt-1 text-sm text-muted">
                Untuk {selectedService?.name ?? "layanan ini"}
              </p>
            </div>
          </div>

          {loadingWorkers ? (
            <p className="text-sm text-muted">Memuat…</p>
          ) : workers.length === 0 ? (
            <div className="surface-card rounded-[1.75rem] p-5 text-sm text-muted">
              Tidak ada worker untuk layanan ini.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:gap-x-4 md:grid-cols-3">
              {workers.map((worker) => (
                <WorkerCard
                  key={worker.id}
                  name={worker.name}
                  specialization={worker.specialization}
                  bio={worker.bio}
                  photoUrl={worker.photo_url}
                  portfolioUrls={worker.portfolio_urls}
                  selected={workerId === worker.id}
                  onSelect={() => handleSelectWorker(worker.id)}
                />
              ))}
            </div>
          )}
          {loadingSlots && workerId ? (
            <p className="mt-3 text-sm text-muted">Memuat jadwal…</p>
          ) : null}
        </section>
      ) : null}

      {/* 3. Jadwal */}
      {workerId ? (
        <section ref={slotsRef} className="surface-card scroll-mt-24 rounded-[1.75rem] p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">Pilih jadwal</h2>
          <p className="mt-1 text-sm text-muted">
            Slot {selectedWorker?.name ?? "worker"}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDateChange(todayIso())}
              className={`h-10 rounded-full px-4 text-sm font-semibold ${
                selectedDate === todayIso()
                  ? "bg-powder-strong text-white"
                  : "bg-lilac-soft text-foreground"
              }`}
            >
              Hari ini
            </button>
            <button
              type="button"
              onClick={() => handleDateChange(tomorrowIso())}
              className={`h-10 rounded-full px-4 text-sm font-semibold ${
                selectedDate === tomorrowIso()
                  ? "bg-powder-strong text-white"
                  : "bg-lilac-soft text-foreground"
              }`}
            >
              Besok
            </button>
            <input
              type="date"
              value={selectedDate}
              min={todayIso()}
              onChange={(e) => handleDateChange(e.target.value)}
              className="h-10 rounded-full border border-border bg-surface px-3 text-sm outline-none focus:border-powder-strong"
            />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {loadingSlots ? (
              <p className="text-sm text-muted">Memuat slot…</p>
            ) : availableSlots.length === 0 ? (
              <p className="text-sm text-muted sm:col-span-2">
                Tidak ada slot di tanggal ini. Coba hari lain.
              </p>
            ) : (
              availableSlots.map((slot) => {
                const selected = slotId === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSlotId(slot.id)}
                    className={`rounded-3xl border p-4 text-left transition-colors ${
                      selected
                        ? "border-powder-strong bg-lilac-soft ring-2 ring-powder-strong/40"
                        : "border-border hover:border-powder"
                    }`}
                  >
                    <p className="font-semibold">{formatSlotTime(slot.start_at, slot.end_at)}</p>
                    <p className="mt-1 text-xs font-medium text-success-text">Tersedia</p>
                  </button>
                );
              })
            )}
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-medium">Catatan (opsional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Preferensi atau catatan singkat…"
              className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-powder-strong"
            />
          </label>
        </section>
      ) : null}

      {/* Hidden fields for form submit */}
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="slotId" value={slotId} />
      <input type="hidden" name="notes" value={notes} />

      {/* Sticky CTA */}
      {canSubmit ? (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-surface/95 p-3 backdrop-blur-md lg:bottom-0">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{selectedService?.name}</p>
              <p className="truncate text-xs text-muted">
                {selectedWorker?.name} · {selectedDate}
              </p>
            </div>
            <button type="submit" className="btn-primary shrink-0">
              Simpan booking
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
