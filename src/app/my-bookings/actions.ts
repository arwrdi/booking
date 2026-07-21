"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import {
  buildMidtransCustomerDetails,
  canResumeSnapPayment,
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
  detail?: string,
) {
  const params = new URLSearchParams();

  if (result === "cancelled") {
    params.set("cancelled", "1");
  } else {
    params.set("error", result);
  }

  if (detail) {
    params.set("payment_error", detail.slice(0, 180));
  }

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

type InvoiceItemRow = {
  id: string;
  service_id: string | null;
  service_name: string;
  price: number;
  qty: number;
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
  created_at: string;
};

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

  if (booking.payment_status !== "ready_to_pay") {
    redirect(buildMyBookingsRedirect("payment_not_ready"));
  }

  const [{ data: profile }, { data: invoiceItems }, { data: payment }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", user.id)
      .maybeSingle<ProfilePaymentRow>(),
    supabase
      .from("booking_invoice_items")
      .select("id, service_id, service_name, price, qty")
      .eq("booking_id", booking.id),
    supabase
      .from("payments")
      .select("id, provider_order_id, status, redirect_url, created_at")
      .eq("booking_id", booking.id)
      .maybeSingle<PaymentRow>(),
  ]);

  const items = (invoiceItems ?? []) as InvoiceItemRow[];
  const grossAmount = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (!profile?.email || items.length === 0 || grossAmount <= 0) {
    redirect(
      buildMyBookingsRedirect(
        "payment_create_failed",
        "Data profil atau invoice belum lengkap untuk membuat transaksi.",
      ),
    );
  }

  if (payment?.status === "paid") {
    redirect(buildMyBookingsRedirect("payment_not_ready"));
  }

  if (canResumeSnapPayment(payment)) {
    redirect(payment!.redirect_url as string);
  }

  const providerOrderId = createMidtransOrderId(booking.id);
  const { appBaseUrl } = getMidtransEnv();

  try {
    const transaction = await createSnapRedirectTransaction({
      orderId: providerOrderId,
      grossAmount,
      customerDetails: buildMidtransCustomerDetails(
        profile.full_name,
        profile.email ?? "",
        profile.phone,
      ),
      itemDetails: items.map((item) => ({
        id: item.service_id ?? item.id,
        price: item.price,
        quantity: item.qty,
        name: item.service_name.slice(0, 50),
      })),
      expiryMinutes: 60,
      callbackUrls: {
        finish: `${appBaseUrl}/payment/result?result=finish`,
        unfinish: `${appBaseUrl}/payment/result?result=unfinish`,
        error: `${appBaseUrl}/payment/result?result=error`,
      },
    });

    const paymentPayload = {
      booking_id: booking.id,
      provider: "midtrans",
      provider_order_id: providerOrderId,
      amount: grossAmount,
      currency: "IDR",
      status: "pending",
      snap_token: transaction.token,
      redirect_url: transaction.redirect_url,
      status_message: "Midtrans transaction created",
      raw_transaction: { ...transaction, invoice_items: items },
      paid_at: null,
      expired_at: null,
    };

    // Update existing row when recreating Snap; insert when belum ada payment.
    // Ini menghindari konflik unique booking_id / provider_order_id pada attempt kedua.
    const { error } = payment?.id
      ? await supabase.from("payments").update(paymentPayload).eq("id", payment.id)
      : await supabase.from("payments").insert(paymentPayload);

    if (error) {
      redirect(buildMyBookingsRedirect("payment_create_failed", error.message));
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
      buildMyBookingsRedirect(
        "payment_create_failed",
        error instanceof Error ? error.message : "unknown_error",
      ),
    );
  }
}
