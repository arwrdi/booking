"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getSupabaseBrowserClient } from "@/infrastructure/supabase/browserClient";

type GoogleSignInButtonProps = {
  nextPath?: string;
  className?: string;
};

function getSafeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

export function GoogleSignInButton({
  nextPath,
  className,
}: GoogleSignInButtonProps) {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const redirectPath = useMemo(() => {
    return getSafeNextPath(nextPath ?? searchParams.get("next"));
  }, [nextPath, searchParams]);

  async function handleSignIn() {
    const supabase = getSupabaseBrowserClient();
    setIsLoading(true);
    setErrorMessage(null);

    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", redirectPath);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        className={
          className ??
          "inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        }
      >
        {isLoading ? "Mengarahkan ke Google..." : "Lanjut dengan Google"}
      </button>

      {errorMessage ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>
      ) : null}
    </div>
  );
}
