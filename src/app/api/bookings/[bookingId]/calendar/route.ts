import { NextResponse, type NextRequest } from "next/server";

import { buildIcsCalendar } from "@/infrastructure/calendar/ics";
import { getCurrentAuthState } from "@/infrastructure/supabase/auth";
import { getSupabaseServerClient } from "@/infrastructure/supabase/serverClient";
import { getConfiguredAppOrigin } from "@/infrastructure/http/requestOrigin";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

type BookingCalendarRow = {
  id: string;
  customer_id: string;
  start_at: string;
  end_at: string;
  status: string;
  payment_status: string;
  notes: string | null;
  worker: { name: string } | { name: string }[] | null;
  service: { name: string } | { name: string }[] | null;
};

function unwrapName(
  value: { name: string } | { name: string }[] | null | undefined,
) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0]?.name ?? null;
  }

  return value.name;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { bookingId } = await context.params;
  const { user, isEmailVerified } = await getCurrentAuthState();

  if (!user || !isEmailVerified) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, customer_id, start_at, end_at, status, payment_status, notes, worker:workers(name), service:services(name)",
    )
    .eq("id", bookingId)
    .maybeSingle<BookingCalendarRow>();

  if (error || !data || data.customer_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const canExport =
    ["confirmed", "in_progress", "completed"].includes(data.status) ||
    data.payment_status === "paid";

  if (!canExport) {
    return NextResponse.json({ error: "not_confirmed" }, { status: 400 });
  }

  const serviceName = unwrapName(data.service) ?? "Booking";
  const workerName = unwrapName(data.worker);
  const appOrigin = getConfiguredAppOrigin() ?? "http://localhost:3000";
  const ics = buildIcsCalendar({
    uid: `${data.id}@booking-mvp`,
    title: serviceName,
    description: [
      workerName ? `Worker: ${workerName}` : null,
      data.notes ? `Catatan: ${data.notes}` : null,
      `Kelola booking: ${appOrigin}/my-bookings`,
    ]
      .filter(Boolean)
      .join("\n"),
    location: workerName ?? undefined,
    startAt: data.start_at,
    endAt: data.end_at,
    url: `${appOrigin}/my-bookings`,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="booking-${data.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
