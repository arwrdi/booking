import { getSupabaseServerClient } from "./serverClient";

type JoinedWorker = {
  id: string;
  name: string;
  specialization: string | null;
} | null;

type JoinedService = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
} | null;

type JoinedPayment = {
  id: string;
  provider_order_id: string;
  payment_method: string | null;
  status: string;
  redirect_url: string | null;
  paid_at: string | null;
  expired_at: string | null;
} | null;

type BookingRow = {
  id: string;
  booking_date: string;
  start_at: string;
  end_at: string;
  status: string;
  payment_status: string;
  notes: string | null;
  held_until: string | null;
  created_at: string;
  worker: JoinedWorker | JoinedWorker[];
  service: JoinedService | JoinedService[];
  payment: JoinedPayment | JoinedPayment[];
};

export type BookingSummary = {
  id: string;
  booking_date: string;
  start_at: string;
  end_at: string;
  status: string;
  payment_status: string;
  notes: string | null;
  held_until: string | null;
  created_at: string;
  worker: JoinedWorker;
  service: JoinedService;
  payment: JoinedPayment;
  canCancel: boolean;
  canPay: boolean;
};

function unwrapJoinedRecord<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export async function getMyBookings() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, booking_date, start_at, end_at, status, payment_status, notes, held_until, created_at, worker:workers(id, name, specialization), service:services(id, name, duration_minutes, price), payment:payments(id, provider_order_id, payment_method, status, redirect_url, paid_at, expired_at)",
    )
    .order("start_at", { ascending: true });

  return {
    data: ((data ?? []) as BookingRow[]).map((booking) => ({
      id: booking.id,
      booking_date: booking.booking_date,
      start_at: booking.start_at,
      end_at: booking.end_at,
      status: booking.status,
      payment_status: booking.payment_status,
      notes: booking.notes,
      held_until: booking.held_until,
      created_at: booking.created_at,
      worker: unwrapJoinedRecord(booking.worker),
      service: unwrapJoinedRecord(booking.service),
      payment: unwrapJoinedRecord(booking.payment),
      canCancel:
        ["pending_payment", "confirmed"].includes(booking.status) &&
        booking.payment_status !== "paid",
      canPay:
        booking.status === "pending_payment" &&
        booking.payment_status === "pending" &&
        Boolean(booking.held_until) &&
        new Date(booking.held_until).getTime() > Date.now(),
    })) as BookingSummary[],
    errorMessage: error ? error.message : null,
  };
}
