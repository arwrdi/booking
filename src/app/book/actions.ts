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

  const [{ data: profile }, { data: service }, { data: slot, error: slotError }] =
    await Promise.all([
      supabase.from("profiles").select("id").eq("id", user.id).maybeSingle(),
      supabase
        .from("services")
        .select("id, duration_minutes")
        .eq("id", serviceId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("availability_slots")
        .select("id, worker_id, start_at, end_at, is_available")
        .eq("id", slotId)
        .maybeSingle(),
    ]);

  if (!profile) {
    redirect(buildBookRedirect("profile_missing", serviceId, slotId));
  }

  if (!service) {
    redirect(buildBookRedirect("service_missing", serviceId, slotId));
  }

  if (!slot || slotError) {
    redirect(buildBookRedirect("slot_missing", serviceId, slotId));
  }

  const { data: relation, error: relationError } = await supabase
    .from("worker_services")
    .select("worker_id, service_id")
    .eq("worker_id", slot.worker_id)
    .eq("service_id", service.id)
    .maybeSingle();

  if (relationError?.code === "42P01") {
    redirect(buildBookRedirect("relation_missing", serviceId, slotId));
  }

  if (!relation) {
    redirect(buildBookRedirect("service_not_supported", serviceId, slotId));
  }

  if (!slot.is_available) {
    redirect(buildBookRedirect("slot_unavailable", serviceId, slotId));
  }

  const startAt = new Date(slot.start_at);
  const endAt = new Date(slot.end_at);

  if (Number.isNaN(startAt.valueOf()) || Number.isNaN(endAt.valueOf())) {
    redirect(buildBookRedirect("slot_invalid", serviceId, slotId));
  }

  const heldUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const bookingDate = slot.start_at.slice(0, 10);
  const trimmedNotes = notes ? notes.slice(0, 500) : null;

  const { error } = await supabase.from("bookings").insert({
    customer_id: user.id,
    worker_id: slot.worker_id,
    service_id: service.id,
    slot_id: slot.id,
    booking_date: bookingDate,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    status: "pending_payment",
    payment_status: "pending",
    notes: trimmedNotes,
    held_until: heldUntil,
  });

  if (error) {
    if (error.code === "23505") {
      redirect(buildBookRedirect("slot_taken", serviceId, slotId));
    }

    redirect(buildBookRedirect("insert_failed", serviceId, slotId));
  }

  revalidatePath("/");
  revalidatePath("/availability");
  revalidatePath("/workers");
  revalidatePath("/book");
  revalidatePath("/my-bookings");

  redirect("/my-bookings?created=1");
}
