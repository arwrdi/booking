import type { User } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "./serverClient";

export type AuthState = {
  user: User | null;
  isEmailVerified: boolean;
};

export type AppRole = "customer" | "admin";

export type ProfileSummary = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
};

export function isEmailVerified(user: User | null) {
  return Boolean(user?.email_confirmed_at);
}

export function buildVerifyEmailPath(email: string | null | undefined, nextPath = "/") {
  const params = new URLSearchParams();

  if (email) {
    params.set("email", email);
  }

  if (nextPath.startsWith("/")) {
    params.set("next", nextPath);
  }

  const query = params.toString();
  return query ? `/verify-email?${query}` : "/verify-email";
}

export async function getCurrentUser(): Promise<User | null> {
  const { user } = await getCurrentAuthState();
  return user;
}

export async function getCurrentAuthState(): Promise<AuthState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return {
      user: null,
      isEmailVerified: false,
    };
  }

  return {
    user,
    isEmailVerified: isEmailVerified(user),
  };
}

export async function getCurrentVerifiedUser(): Promise<User | null> {
  const { user, isEmailVerified } = await getCurrentAuthState();

  if (!user || !isEmailVerified) {
    return null;
  }

  return user;
}

export async function getCurrentProfile(): Promise<ProfileSummary | null> {
  const { user } = await getCurrentAuthState();

  if (!user) {
    return null;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle<ProfileSummary>();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getCurrentAdminProfile(): Promise<ProfileSummary | null> {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "admin") {
    return null;
  }

  return profile;
}
