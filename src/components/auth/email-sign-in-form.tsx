"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getSupabaseBrowserClient } from "@/infrastructure/supabase/browserClient";

type EmailSignInFormProps = {
  nextPath?: string;
};

function getSafeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

function getFriendlySignInError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("email not confirmed") ||
    normalized.includes("email not confirmed")
  ) {
    return "Email belum terverifikasi. Cek inbox lalu klik link verifikasi sebelum login.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Email atau password tidak cocok.";
  }

  return "Login belum berhasil. Periksa email dan password lalu coba lagi.";
}

export function EmailSignInForm({ nextPath }: EmailSignInFormProps) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const redirectPath = useMemo(() => {
    return getSafeNextPath(nextPath ?? searchParams.get("next"));
  }, [nextPath, searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setErrorMessage("Isi email dan password terlebih dulu.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      setErrorMessage(getFriendlySignInError(error.message));
      setIsLoading(false);
      return;
    }

    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut();
      window.location.assign(
        `/verify-email?email=${encodeURIComponent(trimmedEmail)}&next=${encodeURIComponent(redirectPath)}&error=email_unverified`,
      );
      return;
    }

    window.location.assign(redirectPath);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@email.com"
          className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Masukkan password"
          className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
        />
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isLoading ? "Memproses..." : "Masuk dengan Email"}
      </button>

      {errorMessage ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>
      ) : null}
    </form>
  );
}
