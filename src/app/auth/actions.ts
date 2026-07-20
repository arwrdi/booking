"use server";

import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/infrastructure/supabase/serverClient";

export async function signOut() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
