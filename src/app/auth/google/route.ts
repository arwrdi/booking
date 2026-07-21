import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getRequestOrigin } from "@/infrastructure/http/requestOrigin";
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
  const origin = getRequestOrigin(request);
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const redirectTo = new URL("/auth/callback", origin);
  redirectTo.searchParams.set("next", nextPath);

  const pendingCookies: {
    name: string;
    value: string;
    options: Parameters<NextResponse["cookies"]["set"]>[2];
  }[] = [];

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        void headers;
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options });
        });
      },
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
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "oauth_start_failed");
    loginUrl.searchParams.set("next", nextPath);
    const failureResponse = NextResponse.redirect(loginUrl);
    pendingCookies.forEach(({ name, value, options }) => {
      failureResponse.cookies.set(name, value, options);
    });
    return failureResponse;
  }

  const response = NextResponse.redirect(data.url);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}
