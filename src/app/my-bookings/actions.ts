"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/infrastructure/supabase/serverClient";

function getSafeSelectedValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function buildMyBookingsRedirect(result: "cancelled" | "cancel_failed" | "missing_booking") {
  const params = new URLSearchParams();

  if (result === "cancelled") {
    params.set("cancelled", "1");
  } else {
    params.set("error", result);
  }

  return `/my-bookings?${params.toString()}`;
}

export async function cancelBooking(formData: FormData) {
  const bookingId = getSafeSelectedValue(formData.get("bookingId"));
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/my-bookings");
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
