"use client";

import { useState } from "react";

import { getSupabaseBrowserClient } from "@/infrastructure/supabase/browserClient";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    setIsLoading(true);

    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      className={
        className ??
        "inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
      }
    >
      {isLoading ? "Keluar..." : "Sign out"}
    </button>
  );
}
