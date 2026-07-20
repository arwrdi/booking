"use server";

import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/infrastructure/supabase/serverClient";

export type LoginFormState = {
  error: string | null;
};

function getSafeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

function getFriendlySignInError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "Email belum terverifikasi. Cek inbox lalu klik link verifikasi sebelum login.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Email atau password tidak cocok.";
  }

  return "Login belum berhasil. Periksa email dan password lalu coba lagi.";
}

function buildVerifyEmailRedirect(email: string, nextPath: string) {
  const params = new URLSearchParams();
  params.set("email", email);
  params.set("next", nextPath);
  params.set("error", "email_unverified");
  return `/verify-email?${params.toString()}`;
}

export async function signInWithEmail(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const nextPath = getSafeNextPath(formData.get("nextPath"));

  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";

  if (!email || !password) {
    return {
      error: "Isi email dan password terlebih dulu.",
    };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: getFriendlySignInError(error.message),
    };
  }

  if (!data.user?.email_confirmed_at) {
    await supabase.auth.signOut();
    redirect(buildVerifyEmailRedirect(email, nextPath));
  }

  redirect(nextPath);
}
