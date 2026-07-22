import { getSupabaseAdminClient } from "./adminClient";
import { getSupabaseServerClient } from "./serverClient";

type JoinedName = { name: string } | { name: string }[] | null;
type JoinedCustomer =
  | { full_name: string | null; email: string | null }
  | { full_name: string | null; email: string | null }[]
  | null;

type AdminBookingRow = {
  id: string;
  booking_date: string;
  start_at: string;
  end_at: string;
  status: string;
  payment_status: string;
  notes?: string | null;
  created_at: string;
  worker_id?: string;
  slot_id?: string | null;
  customer: JoinedCustomer;
  worker: JoinedName;
  service:
    | { name: string; price: number }
    | { name: string; price: number }[]
    | null;
};

export type AdminBookingSummary = {
  id: string;
  booking_date: string;
  start_at: string;
  end_at: string;
  status: string;
  payment_status: string;
  created_at: string;
  customerName: string | null;
  customerEmail: string | null;
  workerName: string | null;
  serviceName: string | null;
  servicePrice: number | null;
};

function unwrapJoinedRecord<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export async function getAdminBookings(limit = 50) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, booking_date, start_at, end_at, status, payment_status, created_at, customer:profiles!customer_id(full_name, email), worker:workers(name), service:services(name, price)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const bookings = ((data ?? []) as AdminBookingRow[]).map((booking) => {
    const customer = unwrapJoinedRecord(booking.customer);
    const worker = unwrapJoinedRecord(booking.worker);
    const service = unwrapJoinedRecord(booking.service);

    return {
      id: booking.id,
      booking_date: booking.booking_date,
      start_at: booking.start_at,
      end_at: booking.end_at,
      status: booking.status,
      payment_status: booking.payment_status,
      created_at: booking.created_at,
      customerName: customer?.full_name ?? null,
      customerEmail: customer?.email ?? null,
      workerName: worker?.name ?? null,
      serviceName: service?.name ?? null,
      servicePrice: service?.price ?? null,
    } satisfies AdminBookingSummary;
  });

  const paidBookings = bookings.filter((booking) => booking.payment_status === "paid");
  const revenueToday = paidBookings
    .filter((booking) => {
      const created = new Date(booking.created_at);
      const now = new Date();
      return (
        created.getFullYear() === now.getFullYear() &&
        created.getMonth() === now.getMonth() &&
        created.getDate() === now.getDate()
      );
    })
    .reduce((sum, booking) => sum + (booking.servicePrice ?? 0), 0);

  const serviceCounts = new Map<string, number>();
  const workerCounts = new Map<string, number>();

  for (const booking of paidBookings) {
    if (booking.serviceName) {
      serviceCounts.set(booking.serviceName, (serviceCounts.get(booking.serviceName) ?? 0) + 1);
    }
    if (booking.workerName) {
      workerCounts.set(booking.workerName, (workerCounts.get(booking.workerName) ?? 0) + 1);
    }
  }

  const topService =
    [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Belum ada data";
  const topWorker =
    [...workerCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Belum ada data";

  return {
    data: bookings,
    errorMessage: error ? error.message : null,
    stats: {
      totalBookings: bookings.length,
      paidBookings: paidBookings.length,
      pendingPayment: bookings.filter(
        (booking) => booking.payment_status === "ready_to_pay",
      ).length,
      revenueToday,
      topService,
      topWorker,
    },
  };
}

export type AdminBookingDetail = {
  id: string;
  booking_date: string;
  start_at: string;
  end_at: string;
  status: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  workerId: string | null;
  slotId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  workerName: string | null;
  serviceName: string | null;
  invoiceItems: {
    id: string;
    service_name: string;
    price: number;
    qty: number;
    added_by_admin: boolean;
    created_at: string;
  }[];
  invoiceTotal: number;
};

export async function getAdminBookingDetail(
  bookingId: string,
): Promise<{ data: AdminBookingDetail | null; errorMessage: string | null }> {
  const supabase = getSupabaseAdminClient();

  const [bookingResult, itemsResult] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, booking_date, start_at, end_at, status, payment_status, notes, created_at, worker_id, slot_id, customer:profiles!customer_id(full_name, email), worker:workers(name), service:services(name)",
      )
      .eq("id", bookingId)
      .maybeSingle(),
    supabase
      .from("booking_invoice_items")
      .select("id, service_name, price, qty, added_by_admin, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true }),
  ]);

  if (bookingResult.error || !bookingResult.data) {
    return { data: null, errorMessage: bookingResult.error?.message ?? "Booking tidak ditemukan." };
  }

  const b = bookingResult.data as AdminBookingRow;
  const customer = Array.isArray(b.customer) ? (b.customer[0] ?? null) : (b.customer ?? null);
  const worker = Array.isArray(b.worker) ? (b.worker[0] ?? null) : (b.worker ?? null);
  const service = Array.isArray(b.service) ? (b.service[0] ?? null) : (b.service ?? null);
  const items = (itemsResult.data ?? []) as AdminBookingDetail["invoiceItems"];

  return {
    data: {
      id: b.id,
      booking_date: b.booking_date,
      start_at: b.start_at,
      end_at: b.end_at,
      status: b.status,
      payment_status: b.payment_status,
      notes: b.notes ?? null,
      created_at: b.created_at,
      workerId: b.worker_id ?? null,
      slotId: b.slot_id ?? null,
      customerName: customer?.full_name ?? null,
      customerEmail: (customer as { email?: string | null } | null)?.email ?? null,
      workerName: worker?.name ?? null,
      serviceName: (service as { name?: string } | null)?.name ?? null,
      invoiceItems: items,
      invoiceTotal: items.reduce((sum, item) => sum + item.price * item.qty, 0),
    },
    errorMessage: itemsResult.error?.message ?? null,
  };
}
