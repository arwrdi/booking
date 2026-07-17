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
