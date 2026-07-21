"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getSupabaseBrowserClient } from "@/infrastructure/supabase/browserClient";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

/**
 * Menangani fallback OAuth implicit (#access_token=...) yang tidak pernah
 * sampai ke server. Memulihkan session di browser lalu redirect.
 */
export function OAuthHashRecovery() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash;
    if (!hash.includes("access_token=")) {
      return;
    }

    startedRef.current = true;
    const nextPath = getSafeNextPath(searchParams.get("next"));
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    void (async () => {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        return;
      }

      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
      router.replace(nextPath);
      router.refresh();
    })();
  }, [router, searchParams]);

  return null;
}
