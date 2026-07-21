import { getSupabaseServerClient } from "./serverClient";

export type PublicServiceWorker = {
  id: string;
  name: string;
  specialization: string | null;
};

export type PublicWorkerService = {
  id: string;
  name: string;
  category: string | null;
  duration_minutes: number;
  price: number;
};

export type PublicService = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  workers: PublicServiceWorker[];
};

export type PublicWorker = {
  id: string;
  name: string;
  specialization: string | null;
  photo_url: string | null;
  is_active: boolean;
  services: PublicWorkerService[];
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
  availableServiceIds: string[];
  services: PublicWorkerService[];
  worker: Pick<PublicWorker, "id" | "name" | "specialization"> | null;
};

type WorkerServiceRow = {
  worker_id: string;
  service_id: string;
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

async function getPublicCatalogContext() {
  const supabase = await getSupabaseServerClient();
  const [workersResult, servicesResult, relationsResult] = await Promise.all([
    supabase
      .from("workers")
      .select("id, name, specialization, photo_url, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("services")
      .select("id, name, category, description, price, duration_minutes, is_active")
      .eq("is_active", true)
      .order("price", { ascending: true }),
    supabase.from("worker_services").select("worker_id, service_id"),
  ]);

  const workers = (workersResult.data ?? []) as Omit<PublicWorker, "services">[];
  const services = (servicesResult.data ?? []) as Omit<PublicService, "workers">[];
  const relations = (relationsResult.data ?? []) as WorkerServiceRow[];

  return {
    workers,
    services,
    relations,
    errorMessage:
      getQueryErrorMessage(
        "workers",
        workersResult.error as { message: string; code?: string; status?: number } | null,
      ) ??
      getQueryErrorMessage(
        "services",
        servicesResult.error as { message: string; code?: string; status?: number } | null,
      ) ??
      getQueryErrorMessage(
        "worker_services",
        relationsResult.error as { message: string; code?: string; status?: number } | null,
      ),
  };
}

export async function getPublicServices(): Promise<QueryState<PublicService[]>> {
  const { workers, services, relations, errorMessage } = await getPublicCatalogContext();
  const workerMap = new Map(workers.map((worker) => [worker.id, worker]));

  return {
    data: services.map((service) => ({
      ...service,
      workers: relations
        .filter((relation) => relation.service_id === service.id)
        .map((relation) => {
          const worker = workerMap.get(relation.worker_id);
          return worker
            ? {
                id: worker.id,
                name: worker.name,
                specialization: worker.specialization,
              }
            : null;
        })
        .filter((worker): worker is PublicServiceWorker => worker !== null),
    })),
    errorMessage,
  };
}

export async function getPublicWorkers(): Promise<QueryState<PublicWorker[]>> {
  const { workers, services, relations, errorMessage } = await getPublicCatalogContext();
  const serviceMap = new Map(services.map((service) => [service.id, service]));

  return {
    data: workers.map((worker) => ({
      ...worker,
      services: relations
        .filter((relation) => relation.worker_id === worker.id)
        .map((relation) => {
          const service = serviceMap.get(relation.service_id);
          return service
            ? {
                id: service.id,
                name: service.name,
                category: service.category,
                duration_minutes: service.duration_minutes,
                price: service.price,
              }
            : null;
        })
        .filter((service): service is PublicWorkerService => service !== null),
    })),
    errorMessage,
  };
}

export async function getPublicAvailabilitySlots(
  limit = 24,
): Promise<QueryState<PublicAvailabilitySlot[]>> {
  const supabase = await getSupabaseServerClient();
  const now = new Date().toISOString();

  const [{ workers, services, relations, errorMessage: catalogError }, slotsResult] =
    await Promise.all([
      getPublicCatalogContext(),
    supabase
      .from("availability_slots")
      .select("id, worker_id, start_at, end_at, is_available")
      .eq("is_available", true)
      .gte("start_at", now)
      .order("start_at", { ascending: true })
      .limit(limit),
    ]);

  const slotsError = getQueryErrorMessage(
    "availability_slots",
    slotsResult.error as { message: string; code?: string; status?: number } | null,
  );

  const workerMap = new Map(
    workers.map((worker) => [worker.id, worker]),
  );
  const serviceMap = new Map(services.map((service) => [service.id, service]));

  const data = ((slotsResult.data ?? []) as AvailabilitySlotRow[]).map((slot) => {
    const worker = workerMap.get(slot.worker_id);
    const relatedServices = relations
      .filter((relation) => relation.worker_id === slot.worker_id)
      .map((relation) => {
        const service = serviceMap.get(relation.service_id);
        return service
          ? {
              id: service.id,
              name: service.name,
              category: service.category,
              duration_minutes: service.duration_minutes,
              price: service.price,
            }
          : null;
      })
      .filter((service): service is PublicWorkerService => service !== null);

    return {
      id: slot.id,
      start_at: slot.start_at,
      end_at: slot.end_at,
      is_available: slot.is_available,
      availableServiceIds: relatedServices.map((service) => service.id),
      services: relatedServices,
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
    errorMessage: catalogError ?? slotsError,
  };
}

export type WorkerWithPortfolio = {
  id: string;
  name: string;
  specialization: string | null;
  photo_url: string | null;
  bio: string | null;
  portfolio_urls: string[];
  services: PublicWorkerService[];
};

export async function getWorkersForService(
  serviceId: string,
): Promise<QueryState<WorkerWithPortfolio[]>> {
  if (!serviceId) {
    return { data: [], errorMessage: null };
  }

  const supabase = await getSupabaseServerClient();
  const { workers, services, relations, errorMessage } = await getPublicCatalogContext();

  const workerIdsForService = relations
    .filter((r) => r.service_id === serviceId)
    .map((r) => r.worker_id);

  const serviceMap = new Map(services.map((s) => [s.id, s]));

  // Ambil bio & portfolio_urls dari DB (field baru di migration 011)
  const { data: workerDetails } = await supabase
    .from("workers")
    .select("id, bio, portfolio_urls")
    .in("id", workerIdsForService.length > 0 ? workerIdsForService : ["00000000-0000-0000-0000-000000000000"]);

  const detailMap = new Map(
    ((workerDetails ?? []) as { id: string; bio: string | null; portfolio_urls: string[] }[]).map(
      (w) => [w.id, w],
    ),
  );

  const data = workers
    .filter((w) => workerIdsForService.includes(w.id))
    .map((worker) => ({
      id: worker.id,
      name: worker.name,
      specialization: worker.specialization,
      photo_url: worker.photo_url,
      bio: detailMap.get(worker.id)?.bio ?? null,
      portfolio_urls: detailMap.get(worker.id)?.portfolio_urls ?? [],
      services: relations
        .filter((r) => r.worker_id === worker.id)
        .map((r) => {
          const s = serviceMap.get(r.service_id);
          return s
            ? { id: s.id, name: s.name, category: s.category, duration_minutes: s.duration_minutes, price: s.price }
            : null;
        })
        .filter((s): s is PublicWorkerService => s !== null),
    }));

  return { data, errorMessage };
}

export async function getSlotsForWorkerByDate(
  workerId: string,
  dateIso: string,
): Promise<QueryState<PublicAvailabilitySlot[]>> {
  if (!workerId || !dateIso) {
    return { data: [], errorMessage: null };
  }

  const supabase = await getSupabaseServerClient();
  const dayStart = `${dateIso}T00:00:00.000Z`;
  const dayEnd   = `${dateIso}T23:59:59.999Z`;

  const [{ workers, services, relations, errorMessage: catalogError }, slotsResult] =
    await Promise.all([
      getPublicCatalogContext(),
      supabase
        .from("availability_slots")
        .select("id, worker_id, start_at, end_at, is_available")
        .eq("worker_id", workerId)
        .gte("start_at", dayStart)
        .lte("start_at", dayEnd)
        .order("start_at", { ascending: true }),
    ]);

  const slotsError = getQueryErrorMessage(
    "availability_slots",
    slotsResult.error as { message: string; code?: string; status?: number } | null,
  );

  const workerMap = new Map(workers.map((w) => [w.id, w]));
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  const data = ((slotsResult.data ?? []) as AvailabilitySlotRow[]).map((slot) => {
    const worker = workerMap.get(slot.worker_id);
    const relatedServices = relations
      .filter((r) => r.worker_id === slot.worker_id)
      .map((r) => {
        const s = serviceMap.get(r.service_id);
        return s
          ? { id: s.id, name: s.name, category: s.category, duration_minutes: s.duration_minutes, price: s.price }
          : null;
      })
      .filter((s): s is PublicWorkerService => s !== null);

    return {
      id: slot.id,
      start_at: slot.start_at,
      end_at: slot.end_at,
      is_available: slot.is_available,
      availableServiceIds: relatedServices.map((s) => s.id),
      services: relatedServices,
      worker: worker ? { id: worker.id, name: worker.name, specialization: worker.specialization } : null,
    };
  });

  return { data, errorMessage: catalogError ?? slotsError };
}
