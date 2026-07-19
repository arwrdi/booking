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

function buildBookRedirect(error: string, serviceId: string, slotId: string) {
  const params = new URLSearchParams();
  params.set("error", error);

  if (serviceId) {
    params.set("serviceId", serviceId);
  }

  if (slotId) {
    params.set("slotId", slotId);
  }

  return `/book?${params.toString()}`;
}

export async function createBooking(formData: FormData) {
  const serviceId = getSafeSelectedValue(formData.get("serviceId"));
  const slotId = getSafeSelectedValue(formData.get("slotId"));
  const notes = getSafeSelectedValue(formData.get("notes"));
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/book");
  }

  if (!serviceId || !slotId) {
    redirect(buildBookRedirect("missing_fields", serviceId, slotId));
  }

  const { data, error } = await supabase.rpc("create_my_booking", {
    target_service_id: serviceId,
    target_slot_id: slotId,
    booking_notes: notes.slice(0, 500),
  });

  if (error?.code === "42883") {
    redirect(buildBookRedirect("booking_function_missing", serviceId, slotId));
  }

  if (error) {
    redirect(buildBookRedirect("insert_failed", serviceId, slotId));
  }

  if (typeof data !== "string") {
    redirect(buildBookRedirect("insert_failed", serviceId, slotId));
  }

  if (data === "created") {
    revalidatePath("/");
    revalidatePath("/availability");
    revalidatePath("/workers");
    revalidatePath("/book");
    revalidatePath("/my-bookings");

    redirect("/my-bookings?created=1");
  }

  redirect(buildBookRedirect(data, serviceId, slotId));
}
