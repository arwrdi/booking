"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import {
  buildMidtransCustomerDetails,
  createMidtransOrderId,
  createSnapRedirectTransaction,
} from "@/infrastructure/midtrans/service";
import { getMidtransEnv } from "@/infrastructure/midtrans/env";
import { buildVerifyEmailPath, getCurrentAuthState } from "@/infrastructure/supabase/auth";
import { getSupabaseAdminClient } from "@/infrastructure/supabase/adminClient";
import { getSupabaseServerClient } from "@/infrastructure/supabase/serverClient";

function getSafeSelectedValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function buildMyBookingsRedirect(
  result:
    | "cancelled"
    | "cancel_failed"
    | "missing_booking"
    | "payment_missing_booking"
    | "payment_create_failed"
    | "payment_not_ready"
    | "payment_expired"
    | "payment_missing_config",
) {
  const params = new URLSearchParams();

  if (result === "cancelled") {
    params.set("cancelled", "1");
  } else {
    params.set("error", result);
  }

  return `/my-bookings?${params.toString()}`;
}

function buildPaymentFailureDebugRedirect(debug: {
  message: string;
  stage: "midtrans_request" | "payment_upsert";
}) {
  const params = new URLSearchParams();
  params.set("error", "payment_create_failed");
  params.set("dbg_session", "midtrans-second-payment");
  params.set("dbg_payment_stage", debug.stage);
  params.set("dbg_payment_error", debug.message || "(empty)");

  return `/my-bookings?${params.toString()}`;
}

type BookingPaymentRow = {
  id: string;
  customer_id: string;
  service_id: string;
  status: string;
  payment_status: string;
  held_until: string | null;
};

type ProfilePaymentRow = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

type ServicePaymentRow = {
  id: string;
  name: string;
  price: number;
};

type PaymentRow = {
  id: string;
  provider_order_id: string;
  status: string;
  redirect_url: string | null;
};

function canResumeExistingPayment(payment: PaymentRow | null) {
  return payment?.status === "pending" && Boolean(payment.redirect_url);
}

export async function cancelBooking(formData: FormData) {
  const bookingId = getSafeSelectedValue(formData.get("bookingId"));
  const supabase = await getSupabaseServerClient();
  const { user, isEmailVerified } = await getCurrentAuthState();

  if (!user) {
    redirect("/login?next=/my-bookings");
  }

  if (!isEmailVerified) {
    redirect(buildVerifyEmailPath(user.email, "/my-bookings"));
  }

  if (!bookingId) {
    redirect(buildMyBookingsRedirect("missing_booking"));
  }

  const { data, error } = await supabase.rpc("cancel_my_booking", {
    target_booking_id: bookingId,
  });

  if (error || data !== true) {
    redirect(buildMyBookingsRedirect("cancel_failed"));
  }

  revalidatePath("/");
  revalidatePath("/availability");
  revalidatePath("/workers");
  revalidatePath("/book");
  revalidatePath("/my-bookings");

  redirect(buildMyBookingsRedirect("cancelled"));
}

export async function startMidtransPayment(boundBookingId: string, formData: FormData) {
  const bookingId = boundBookingId || getSafeSelectedValue(formData.get("bookingId"));
  const { user, isEmailVerified } = await getCurrentAuthState();

  if (!user) {
    redirect("/login?next=/my-bookings");
  }

  if (!isEmailVerified) {
    redirect(buildVerifyEmailPath(user.email, "/my-bookings"));
  }

  if (!bookingId) {
    redirect(buildMyBookingsRedirect("payment_missing_booking"));
  }

  const supabase = getSupabaseAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id, service_id, status, payment_status, held_until")
    .eq("id", bookingId)
    .maybeSingle<BookingPaymentRow>();

  if (!booking || booking.customer_id !== user.id) {
    redirect(buildMyBookingsRedirect("payment_missing_booking"));
  }

  if (booking.status !== "pending_payment" || booking.payment_status !== "pending") {
    redirect(buildMyBookingsRedirect("payment_not_ready"));
  }

  if (!booking.held_until || new Date(booking.held_until).getTime() <= Date.now()) {
    await supabase.rpc("expire_pending_bookings");
    revalidatePath("/");
    revalidatePath("/availability");
    revalidatePath("/workers");
    revalidatePath("/book");
    revalidatePath("/my-bookings");
    redirect(buildMyBookingsRedirect("payment_expired"));
  }

  const [{ data: profile }, { data: service }, { data: payment }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", user.id)
      .maybeSingle<ProfilePaymentRow>(),
    supabase
      .from("services")
      .select("id, name, price")
      .eq("id", booking.service_id)
      .maybeSingle<ServicePaymentRow>(),
    supabase
      .from("payments")
      .select("id, provider_order_id, status, redirect_url")
      .eq("booking_id", booking.id)
      .maybeSingle<PaymentRow>(),
  ]);

  if (!profile?.email || !service?.name || typeof service.price !== "number") {
    redirect(buildMyBookingsRedirect("payment_create_failed"));
  }

  if (payment?.status === "paid") {
    redirect(buildMyBookingsRedirect("payment_not_ready"));
  }

  if (canResumeExistingPayment(payment)) {
    redirect(payment.redirect_url as string);
  }

  const providerOrderId = createMidtransOrderId(booking.id);
  const { appBaseUrl } = getMidtransEnv();

  try {
    const transaction = await createSnapRedirectTransaction({
      orderId: providerOrderId,
      grossAmount: service.price,
      customerDetails: buildMidtransCustomerDetails(
        profile.full_name,
        profile.email,
        profile.phone,
      ),
      itemDetails: [
        {
          id: service.id,
          price: service.price,
          quantity: 1,
          name: service.name.slice(0, 50),
        },
      ],
      expiryMinutes: 15,
      callbackUrls: {
        finish: `${appBaseUrl}/payment/result?result=finish`,
        unfinish: `${appBaseUrl}/payment/result?result=unfinish`,
        error: `${appBaseUrl}/payment/result?result=error`,
      },
    });

    const { error } = await supabase.from("payments").upsert(
      {
        booking_id: booking.id,
        provider: "midtrans",
        provider_order_id: providerOrderId,
        amount: service.price,
        currency: "IDR",
        status: "pending",
        snap_token: transaction.token,
        redirect_url: transaction.redirect_url,
        status_message: "Midtrans transaction created",
        raw_transaction: transaction,
        paid_at: null,
        expired_at: null,
      },
      {
        onConflict: "booking_id",
      },
    );

    if (error) {
      redirect(
        buildPaymentFailureDebugRedirect({
          stage: "payment_upsert",
          message: error.message,
        }),
      );
    }

    revalidatePath("/my-bookings");
    redirect(transaction.redirect_url);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (error instanceof Error && error.message.includes("MIDTRANS_SERVER_KEY")) {
      redirect(buildMyBookingsRedirect("payment_missing_config"));
    }

    redirect(
      buildPaymentFailureDebugRedirect({
        stage: "midtrans_request",
        message: error instanceof Error ? error.message : "unknown_error",
      }),
    );
  }
}
