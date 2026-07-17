import { getSupabaseServerClient } from "./serverClient";

export type PublicService = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
};

export type PublicWorker = {
  id: string;
  name: string;
  specialization: string | null;
  photo_url: string | null;
  is_active: boolean;
};

type AvailabilitySlotRow = {
  id: string;
  worker_id: string;
  start_at: string;
  end_at: string;
  is_available: boolean;
};

export type PublicAvailabilitySlot = {
  id: string;
  start_at: string;
  end_at: string;
  is_available: boolean;
  worker: Pick<PublicWorker, "id" | "name" | "specialization"> | null;
};

type QueryState<T> = {
  data: T;
  errorMessage: string | null;
};

function getQueryErrorMessage(
  resourceLabel: string,
  error: { message: string; code?: string; status?: number } | null,
) {
  if (!error) return null;

  if (error.code === "42P01") {
    return `Tabel ${resourceLabel} belum dibuat di Supabase.`;
  }

  if (error.status === 401 || error.status === 403) {
    return `Akses ke ${resourceLabel} ditolak. Pastikan policy RLS publik untuk data katalog sudah aktif.`;
  }

  return `Gagal memuat ${resourceLabel}: ${error.message}`;
}

export async function getPublicServices(): Promise<QueryState<PublicService[]>> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, category, description, price, duration_minutes, is_active")
    .eq("is_active", true)
    .order("price", { ascending: true });

  return {
    data: (data ?? []) as PublicService[],
    errorMessage: getQueryErrorMessage(
      "services",
      error as { message: string; code?: string; status?: number } | null,
    ),
  };
}

export async function getPublicWorkers(): Promise<QueryState<PublicWorker[]>> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("workers")
    .select("id, name, specialization, photo_url, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return {
    data: (data ?? []) as PublicWorker[],
    errorMessage: getQueryErrorMessage(
      "workers",
      error as { message: string; code?: string; status?: number } | null,
    ),
  };
}

export async function getPublicAvailabilitySlots(
  limit = 24,
): Promise<QueryState<PublicAvailabilitySlot[]>> {
  const supabase = await getSupabaseServerClient();
  const now = new Date().toISOString();

  const [workersResult, slotsResult] = await Promise.all([
    supabase
      .from("workers")
      .select("id, name, specialization, photo_url, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("availability_slots")
      .select("id, worker_id, start_at, end_at, is_available")
      .eq("is_available", true)
      .gte("start_at", now)
      .order("start_at", { ascending: true })
      .limit(limit),
  ]);

  const workersError = getQueryErrorMessage(
    "workers",
    workersResult.error as { message: string; code?: string; status?: number } | null,
  );
  const slotsError = getQueryErrorMessage(
    "availability_slots",
    slotsResult.error as { message: string; code?: string; status?: number } | null,
  );

  const workerMap = new Map(
    (((workersResult.data ?? []) as PublicWorker[]).map((worker) => [worker.id, worker])),
  );

  const data = ((slotsResult.data ?? []) as AvailabilitySlotRow[]).map((slot) => {
    const worker = workerMap.get(slot.worker_id);

    return {
      id: slot.id,
      start_at: slot.start_at,
      end_at: slot.end_at,
      is_available: slot.is_available,
      worker: worker
        ? {
            id: worker.id,
            name: worker.name,
            specialization: worker.specialization,
          }
        : null,
    };
  });

  return {
    data,
    errorMessage: workersError ?? slotsError,
  };
}
