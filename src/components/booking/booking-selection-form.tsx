"use client";

import { useCallback, useMemo, useState, useTransition } from "react";

import type {
  PublicAvailabilitySlot,
  PublicService,
  PublicWorkerService,
  WorkerWithPortfolio,
} from "@/infrastructure/supabase/publicData";

type Step = "service" | "worker" | "slot";

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

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "service", label: "Layanan" },
    { id: "worker", label: "Worker" },
    { id: "slot", label: "Jadwal" },
  ];
  const order: Record<Step, number> = { service: 0, worker: 1, slot: 2 };

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const done = order[current] > i;
        const active = current === step.id;
        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                active
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : done
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {done ? "✓" : i + 1}
            </div>
            <span
              className={`text-sm font-medium ${active ? "text-zinc-900 dark:text-zinc-50" : done ? "text-indigo-600" : "text-zinc-500 dark:text-zinc-400"}`}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ServiceCard({
  service,
  selected,
  onClick,
}: {
  service: PublicService;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-3xl border p-4 text-left transition-colors ${
        selected
          ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-inset ring-indigo-500"
          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">{service.name}</p>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          {service.duration_minutes} mnt
        </span>
        {service.category ? (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            {service.category}
          </span>
        ) : null}
      </div>
      {service.description ? (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{service.description}</p>
      ) : null}
      <p className="mt-2 text-sm font-medium">{formatCurrency(service.price)}</p>
    </button>
  );
}

function WorkerCard({
  worker,
  selected,
  onClick,
}: {
  worker: WorkerWithPortfolio;
  selected: boolean;
  onClick: () => void;
}) {
  const [showPortfolio, setShowPortfolio] = useState(false);

  return (
    <div
      className={`rounded-3xl border transition-colors ${
        selected
          ? "border-indigo-500 ring-1 ring-inset ring-indigo-500"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start gap-3">
          {worker.photo_url ? (
            <img
              src={worker.photo_url}
              alt={worker.name}
              className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {worker.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 space-y-1">
            <p className="font-semibold">{worker.name}</p>
            {worker.specialization ? (
              <p className="text-sm text-zinc-500">{worker.specialization}</p>
            ) : null}
            {worker.bio ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{worker.bio}</p>
            ) : null}
          </div>
          {selected ? (
            <span className="flex-shrink-0 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white">
              Dipilih
            </span>
          ) : null}
        </div>
      </button>

      {worker.portfolio_urls.length > 0 ? (
        <div className="border-t border-zinc-100 px-4 pb-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPortfolio((v) => !v);
            }}
            className="mt-3 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {showPortfolio ? "Sembunyikan portofolio" : `Lihat portofolio (${worker.portfolio_urls.length})`}
          </button>
          {showPortfolio ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {worker.portfolio_urls.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={url}
                    alt={`Portofolio ${idx + 1}`}
                    className="h-24 w-full rounded-2xl object-cover transition-opacity hover:opacity-80"
                  />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SlotCard({
  slot,
  selected,
  onClick,
  serviceId,
}: {
  slot: PublicAvailabilitySlot;
  selected: boolean;
  onClick: () => void;
  serviceId: string;
}) {
  const serviceOnSlot = slot.services.find((s) => s.id === serviceId);
  return (
    <button
      type="button"
      onClick={slot.is_available ? onClick : undefined}
      disabled={!slot.is_available}
      className={`w-full rounded-3xl border p-4 text-left transition-colors ${
        !slot.is_available
          ? "cursor-not-allowed border-zinc-100 bg-zinc-50 opacity-50 dark:border-zinc-800 dark:bg-zinc-900"
          : selected
            ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-inset ring-indigo-500"
            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{formatSlotTime(slot.start_at, slot.end_at)}</p>
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            slot.is_available
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
          }`}
        >
          {slot.is_available ? "Tersedia" : "Penuh"}
        </span>
      </div>
      {serviceOnSlot ? (
        <p className="mt-1 text-sm text-zinc-500">{formatCurrency(serviceOnSlot.price)}</p>
      ) : null}
    </button>
  );
}

export function BookingSelectionForm({
  services,
  selectedServiceId = "",
  selectedSlotId = "",
}: BookingSelectionFormProps) {
  const [step, setStep] = useState<Step>(selectedServiceId ? "worker" : "service");
  const [serviceId, setServiceId] = useState(selectedServiceId);
  const [workerId, setWorkerId] = useState("");
  const [slotId, setSlotId] = useState(selectedSlotId);
  const [selectedDate, setSelectedDate] = useState(todayIso());

  const [workers, setWorkers] = useState<WorkerWithPortfolio[]>([]);
  const [slots, setSlots] = useState<PublicAvailabilitySlot[]>([]);
  const [loadingWorkers, startLoadWorkers] = useTransition();
  const [loadingSlots, startLoadSlots] = useTransition();
  const [fetchError, setFetchError] = useState<string | null>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );
  const selectedWorker = useMemo(
    () => workers.find((w) => w.id === workerId) ?? null,
    [workers, workerId],
  );
  const selectedSlot = useMemo(
    () => slots.find((s) => s.id === slotId) ?? null,
    [slots, slotId],
  );

  const handleSelectService = useCallback(
    (id: string) => {
      setServiceId(id);
      setWorkerId("");
      setSlotId("");
      setFetchError(null);

      startLoadWorkers(async () => {
        const res = await fetch(`/api/booking/workers-for-service?serviceId=${encodeURIComponent(id)}`);
        if (!res.ok) {
          setFetchError("Gagal memuat daftar worker. Coba refresh halaman.");
          return;
        }
        const json = (await res.json()) as { data: WorkerWithPortfolio[]; error: string | null };
        setWorkers(json.data ?? []);
        setStep("worker");
      });
    },
    [],
  );

  const handleSelectWorker = useCallback(
    (id: string) => {
      setWorkerId(id);
      setSlotId("");
      setFetchError(null);

      startLoadSlots(async () => {
        const res = await fetch(
          `/api/booking/slots-for-worker?workerId=${encodeURIComponent(id)}&date=${encodeURIComponent(selectedDate)}`,
        );
        if (!res.ok) {
          setFetchError("Gagal memuat slot. Coba refresh halaman.");
          return;
        }
        const json = (await res.json()) as { data: PublicAvailabilitySlot[]; error: string | null };
        setSlots(json.data ?? []);
        setStep("slot");
      });
    },
    [selectedDate],
  );

  const handleDateChange = useCallback(
    (date: string) => {
      setSelectedDate(date);
      setSlotId("");
      if (workerId) {
        setFetchError(null);
        startLoadSlots(async () => {
          const res = await fetch(
            `/api/booking/slots-for-worker?workerId=${encodeURIComponent(workerId)}&date=${encodeURIComponent(date)}`,
          );
          if (!res.ok) {
            setFetchError("Gagal memuat slot. Coba refresh halaman.");
            return;
          }
          const json = (await res.json()) as { data: PublicAvailabilitySlot[]; error: string | null };
          setSlots(json.data ?? []);
        });
      }
    },
    [workerId],
  );

  const availableSlotsForService = useMemo(
    () => slots.filter((s) => s.availableServiceIds.includes(serviceId)),
    [slots, serviceId],
  );

  return (
    <div className="space-y-6">
      <StepIndicator current={step} />

      {fetchError ? (
        <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
          {fetchError}
        </div>
      ) : null}

      {/* Step 1: Pilih Layanan */}
      {step === "service" ? (
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-xl font-semibold tracking-tight">Pilih layanan</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Pilih jenis layanan yang ingin kamu gunakan.
          </p>
          <div className="mt-5 space-y-3">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                selected={serviceId === service.id}
                onClick={() => handleSelectService(service.id)}
              />
            ))}
            {services.length === 0 ? (
              <p className="text-sm text-zinc-500">Belum ada layanan aktif.</p>
            ) : null}
          </div>
          {loadingWorkers ? (
            <p className="mt-4 text-sm text-zinc-500">Memuat worker…</p>
          ) : null}
        </section>
      ) : null}

      {/* Step 2: Pilih Worker */}
      {step === "worker" || step === "slot" ? (
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Pilih worker</h2>
              {selectedService ? (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Worker yang tersedia untuk{" "}
                  <span className="font-medium">{selectedService.name}</span>
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setStep("service")}
              className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Ganti layanan
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {loadingWorkers ? (
              <p className="text-sm text-zinc-500">Memuat…</p>
            ) : workers.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Tidak ada worker tersedia untuk layanan ini.
              </p>
            ) : (
              workers.map((worker) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  selected={workerId === worker.id}
                  onClick={() => handleSelectWorker(worker.id)}
                />
              ))
            )}
          </div>
          {loadingSlots && step === "worker" ? (
            <p className="mt-4 text-sm text-zinc-500">Memuat slot…</p>
          ) : null}
        </section>
      ) : null}

      {/* Step 3: Pilih Jadwal */}
      {step === "slot" ? (
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Pilih jadwal</h2>
              {selectedWorker ? (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Slot tersedia untuk{" "}
                  <span className="font-medium">{selectedWorker.name}</span>
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setStep("worker")}
              className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Ganti worker
            </button>
          </div>

          {/* Date picker */}
          <div className="mt-5">
            <label className="block text-sm font-medium">Pilih tanggal</label>
            <input
              type="date"
              value={selectedDate}
              min={todayIso()}
              onChange={(e) => handleDateChange(e.target.value)}
              className="mt-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
            />
          </div>

          <div className="mt-4 space-y-3">
            {loadingSlots ? (
              <p className="text-sm text-zinc-500">Memuat slot…</p>
            ) : availableSlotsForService.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Tidak ada slot tersedia di tanggal ini. Coba pilih tanggal lain.
              </p>
            ) : (
              availableSlotsForService.map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  selected={slotId === slot.id}
                  onClick={() => setSlotId(slot.id)}
                  serviceId={serviceId}
                />
              ))
            )}
          </div>

          {/* Notes + submit */}
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Catatan tambahan (opsional)</span>
              <textarea
                name="notes"
                rows={3}
                placeholder="Contoh: lebih nyaman jam siang atau ada preferensi tertentu."
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
              />
            </label>

            {/* Hidden fields */}
            <input type="hidden" name="serviceId" value={serviceId} />
            <input type="hidden" name="slotId" value={slotId} />

            <button
              type="submit"
              disabled={!slotId}
              className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Simpan booking
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
