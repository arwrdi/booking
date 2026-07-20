"use client";

import { useState } from "react";

import { getSupabaseBrowserClient } from "@/infrastructure/supabase/browserClient";

function buildRecoveryRedirectUrl() {
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  callbackUrl.searchParams.set("next", "/reset-password?recovery=1");
  return callbackUrl.toString();
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage("Masukkan email akun yang ingin di-reset.");
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: buildRecoveryRedirectUrl(),
    });

    if (error) {
      setErrorMessage("Gagal mengirim email reset password. Periksa email lalu coba lagi.");
      setIsLoading(false);
      return;
    }

    setMessage("Link reset password sudah dikirim. Cek inbox dan folder spam.");
    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} method="post" className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Email akun</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@email.com"
          className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
        />
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isLoading ? "Mengirim..." : "Kirim link reset password"}
      </button>

      {message ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>
      ) : null}
    </form>
  );
}
