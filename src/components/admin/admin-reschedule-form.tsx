"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { rescheduleBooking } from "@/app/admin/actions";
import type { PublicAvailabilitySlot } from "@/infrastructure/supabase/publicData";

type AdminRescheduleFormProps = {
  bookingId: string;
  workerId: string;
  currentSlotId: string | null;
  currentStartAt: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toDateIso(value: string) {
  return value.slice(0, 10);
}

function formatSlotLabel(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const time = (d: Date) =>
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${time(start)} – ${time(end)}`;
}

export function AdminRescheduleForm({
  bookingId,
  workerId,
  currentSlotId,
  currentStartAt,
}: AdminRescheduleFormProps) {
  const [selectedDate, setSelectedDate] = useState(
    currentStartAt ? toDateIso(currentStartAt) : todayIso(),
  );
  const [slotId, setSlotId] = useState(currentSlotId ?? "");
  const [slots, setSlots] = useState<PublicAvailabilitySlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  const loadSlots = useCallback(
    (date: string) => {
      setError(null);
      startLoad(async () => {
        const res = await fetch(
          `/api/booking/slots-for-worker?workerId=${encodeURIComponent(workerId)}&date=${encodeURIComponent(date)}`,
        );
        if (!res.ok) {
          setError("Gagal memuat slot. Coba lagi.");
          setSlots([]);
          return;
        }
        const json = (await res.json()) as {
          data: PublicAvailabilitySlot[];
          error: string | null;
        };
        setSlots(json.data ?? []);
      });
    },
    [workerId],
  );

  useEffect(() => {
    loadSlots(selectedDate);
  }, [loadSlots, selectedDate]);

  // Slot tersedia untuk dipilih: yang masih available ATAU slot booking saat ini
  const selectableSlots = slots.filter(
    (slot) => slot.is_available || slot.id === currentSlotId,
  );

  return (
    <div className="rounded-3xl border border-zinc-100 p-4 dark:border-zinc-800">
      <h3 className="text-sm font-semibold">Ubah tanggal / jadwal</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Pilih tanggal baru lalu pilih slot tersedia milik worker yang sama.
      </p>

      <form action={rescheduleBooking} className="mt-3 space-y-3">
        <input type="hidden" name="bookingId" value={bookingId} />
        <input type="hidden" name="slotId" value={slotId} />

        <div>
          <label className="mb-1 block text-xs font-medium">Tanggal</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSlotId("");
            }}
            className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        {error ? <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p> : null}

        <div className="space-y-2">
          <p className="text-xs font-medium">Slot</p>
          {loading ? (
            <p className="text-sm text-zinc-500">Memuat slot…</p>
          ) : selectableSlots.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Tidak ada slot tersedia di tanggal ini.
            </p>
          ) : (
            selectableSlots.map((slot) => (
              <label
                key={slot.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm ${
                  slotId === slot.id
                    ? "border-indigo-500 bg-indigo-500/5"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <input
                  type="radio"
                  name="slotChoice"
                  checked={slotId === slot.id}
                  onChange={() => setSlotId(slot.id)}
                />
                <span>
                  {formatSlotLabel(slot.start_at, slot.end_at)}
                  {slot.id === currentSlotId ? (
                    <span className="ml-2 text-xs text-zinc-500">(saat ini)</span>
                  ) : null}
                </span>
              </label>
            ))
          )}
        </div>

        <button
          type="submit"
          disabled={!slotId || slotId === currentSlotId}
          className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Simpan jadwal baru
        </button>
      </form>
    </div>
  );
}
