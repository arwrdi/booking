import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildBookingConfirmationEmail,
  sendAppEmail,
} from "@/infrastructure/email/sendEmail";
import { getConfiguredAppOrigin } from "@/infrastructure/http/requestOrigin";
import {
  type MidtransNotificationPayload,
  isValidMidtransSignature,
} from "@/infrastructure/midtrans/service";
import { getSupabaseAdminClient } from "@/infrastructure/supabase/adminClient";

export const dynamic = "force-dynamic";

function mapMidtransStatus(
  transactionStatus: string | undefined,
  fraudStatus: string | undefined,
) {
  switch (transactionStatus) {
    case "capture":
      if (fraudStatus && fraudStatus !== "accept") {
        return {
          paymentStatus: "denied",
          bookingStatus: "cancelled",
        };
      }

      return {
        paymentStatus: "paid",
        bookingStatus: "confirmed",
      };
    case "settlement":
      return {
        paymentStatus: "paid",
        bookingStatus: "confirmed",
      };
    case "pending":
      return {
        paymentStatus: "pending",
        bookingStatus: "pending_payment",
      };
    case "expire":
      return {
        paymentStatus: "expired",
        bookingStatus: "expired",
      };
    case "deny":
      return {
        paymentStatus: "denied",
        bookingStatus: "cancelled",
      };
    case "cancel":
      return {
        paymentStatus: "cancelled",
        bookingStatus: "cancelled",
      };
    case "failure":
      return {
        paymentStatus: "failed",
        bookingStatus: "cancelled",
      };
    default:
      return {
        paymentStatus: "pending",
        bookingStatus: "pending_payment",
      };
  }
}

const paymentStatusPriority: Record<string, number> = {
  pending: 1,
  denied: 2,
  failed: 2,
  cancelled: 2,
  expired: 2,
  paid: 3,
};

function getPaymentStatusPriority(status: string) {
  return paymentStatusPriority[status] ?? 0;
}

function shouldApplyPaymentTransition(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) {
    return true;
  }

  if (currentStatus === "paid" && nextStatus !== "paid") {
    return false;
  }

  return getPaymentStatusPriority(nextStatus) >= getPaymentStatusPriority(currentStatus);
}

function getWebhookTimestamp(transactionTime: string | undefined) {
  const parsedDate = transactionTime ? new Date(transactionTime) : new Date();

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString();
  }

  return parsedDate.toISOString();
}

async function sendBookingConfirmedEmail(bookingId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, start_at, end_at, customer:profiles!customer_id(full_name, email), worker:workers(name), service:services(name)",
    )
    .eq("id", bookingId)
    .maybeSingle<{
      id: string;
      start_at: string;
      end_at: string;
      customer:
        | { full_name: string | null; email: string | null }
        | { full_name: string | null; email: string | null }[]
        | null;
      worker: { name: string } | { name: string }[] | null;
      service: { name: string } | { name: string }[] | null;
    }>();

  if (!booking) {
    return;
  }

  const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
  const worker = Array.isArray(booking.worker) ? booking.worker[0] : booking.worker;
  const service = Array.isArray(booking.service) ? booking.service[0] : booking.service;
  const email = customer?.email;

  if (!email || !service?.name) {
    return;
  }

  const appOrigin = getConfiguredAppOrigin() ?? "http://localhost:3000";
  const content = buildBookingConfirmationEmail({
    customerName: customer?.full_name ?? null,
    serviceName: service.name,
    workerName: worker?.name ?? null,
    startAt: booking.start_at,
    endAt: booking.end_at,
    myBookingsUrl: `${appOrigin}/my-bookings`,
    calendarUrl: `${appOrigin}/api/bookings/${booking.id}/calendar`,
  });

  await sendAppEmail({
    to: email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

export async function POST(request: Request) {
  let payload: MidtransNotificationPayload;

  try {
    payload = (await request.json()) as MidtransNotificationPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    !payload.order_id ||
    !payload.transaction_status ||
    !payload.status_code ||
    !payload.gross_amount
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!isValidMidtransSignature(payload)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, booking_id, status")
    .eq("provider_order_id", payload.order_id)
    .maybeSingle<{ id: string; booking_id: string; status: string }>();

  if (!payment) {
    console.warn("Midtrans webhook ignored because order ID is unknown", payload.order_id);
    return NextResponse.json({ received: true, ignored: "unknown_order" });
  }

  const mappedStatus = mapMidtransStatus(payload.transaction_status, payload.fraud_status);
  const shouldUpdatePayment = shouldApplyPaymentTransition(
    payment.status,
    mappedStatus.paymentStatus,
  );
  const becamePaid = mappedStatus.paymentStatus === "paid" && payment.status !== "paid";

  if (!shouldUpdatePayment) {
    return NextResponse.json({
      received: true,
      ignored: "stale_status",
      current_status: payment.status,
    });
  }

  const isPaid = mappedStatus.paymentStatus === "paid";
  const isExpired = mappedStatus.paymentStatus === "expired";
  const webhookTimestamp = getWebhookTimestamp(payload.transaction_time);

  const paymentUpdate = {
    provider_transaction_id: payload.transaction_id ?? null,
    payment_method: payload.payment_type ?? null,
    status: mappedStatus.paymentStatus,
    status_message: payload.status_message ?? null,
    raw_notification: payload,
    paid_at: isPaid ? webhookTimestamp : null,
    expired_at: isExpired ? webhookTimestamp : null,
  };

  const { error: paymentError } = await supabase
    .from("payments")
    .update(paymentUpdate)
    .eq("id", payment.id);

  if (paymentError) {
    return NextResponse.json({ error: "payment_update_failed" }, { status: 500 });
  }

  // Flow baru: booking sudah 'completed' sebelum user bayar.
  // Webhook paid hanya update payment_status; status booking tidak diregress ke 'confirmed'.
  const bookingPatch =
    mappedStatus.paymentStatus === "paid"
      ? {
          payment_status: "paid",
          held_until: null,
        }
      : mappedStatus.bookingStatus === "expired"
        ? {
            status: "expired",
            payment_status: mappedStatus.paymentStatus,
            held_until: null,
          }
        : mappedStatus.bookingStatus === "cancelled"
          ? {
              status: "cancelled",
              payment_status: mappedStatus.paymentStatus,
              held_until: null,
            }
          : {
              payment_status: mappedStatus.paymentStatus,
            };

  const { error: bookingError } = await supabase
    .from("bookings")
    .update(bookingPatch)
    .eq("id", payment.booking_id);

  if (bookingError) {
    return NextResponse.json({ error: "booking_update_failed" }, { status: 500 });
  }

  if (becamePaid) {
    try {
      await sendBookingConfirmedEmail(payment.booking_id);
    } catch (error) {
      console.error("Failed to send booking confirmation email", error);
    }
  }

  revalidatePath("/");
  revalidatePath("/availability");
  revalidatePath("/workers");
  revalidatePath("/book");
  revalidatePath("/my-bookings");
  revalidatePath("/admin");

  return NextResponse.json({ received: true });
}
