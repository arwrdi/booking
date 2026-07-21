"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAdminProfile } from "@/infrastructure/supabase/auth";
import { getSupabaseServerClient } from "@/infrastructure/supabase/serverClient";

function buildAdminRedirect(bookingId: string, result: string) {
  return `/admin/booking/${encodeURIComponent(bookingId)}?result=${encodeURIComponent(result)}`;
}

export async function addInvoiceItem(formData: FormData) {
  const admin = await getCurrentAdminProfile();
  if (!admin) redirect("/");

  const bookingId = (formData.get("bookingId") as string | null)?.trim() ?? "";
  const serviceId = (formData.get("serviceId") as string | null)?.trim() ?? "";
  const qty = parseInt((formData.get("qty") as string | null) ?? "1", 10);

  if (!bookingId || !serviceId) {
    redirect(buildAdminRedirect(bookingId, "missing_fields"));
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_add_booking_item", {
    target_booking_id: bookingId,
    target_service_id: serviceId,
    item_qty: isNaN(qty) || qty < 1 ? 1 : qty,
  });

  if (error || data !== "added") {
    redirect(buildAdminRedirect(bookingId, error?.message ?? data ?? "add_failed"));
  }

  revalidatePath(`/admin/booking/${bookingId}`);
  revalidatePath("/admin");
  redirect(buildAdminRedirect(bookingId, "item_added"));
}

export async function markBookingCompleted(formData: FormData) {
  const admin = await getCurrentAdminProfile();
  if (!admin) redirect("/");

  const bookingId = (formData.get("bookingId") as string | null)?.trim() ?? "";

  if (!bookingId) {
    redirect("/admin?result=missing_booking");
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_mark_booking_completed", {
    target_booking_id: bookingId,
  });

  if (error || data !== "completed") {
    redirect(buildAdminRedirect(bookingId, error?.message ?? data ?? "complete_failed"));
  }

  revalidatePath(`/admin/booking/${bookingId}`);
  revalidatePath("/admin");
  redirect(buildAdminRedirect(bookingId, "service_completed"));
}

export async function cancelBookingAdmin(formData: FormData) {
  const admin = await getCurrentAdminProfile();
  if (!admin) redirect("/");

  const bookingId = (formData.get("bookingId") as string | null)?.trim() ?? "";

  if (!bookingId) {
    redirect("/admin?result=missing_booking");
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_cancel_booking", {
    target_booking_id: bookingId,
  });

  if (error || data !== "cancelled") {
    redirect(buildAdminRedirect(bookingId, error?.message ?? data ?? "cancel_failed"));
  }

  revalidatePath(`/admin/booking/${bookingId}`);
  revalidatePath("/admin");
  redirect(`/admin?result=booking_cancelled`);
}
