import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/infrastructure/supabase/env";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();
  const requestUrl = new URL(request.url);
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const redirectTo = new URL("/auth/callback", requestUrl.origin);
  redirectTo.searchParams.set("next", nextPath);

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo.toString(),
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "oauth_start_failed");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(data.url);
}
