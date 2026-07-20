"use client";

import { useState } from "react";

import { getSupabaseBrowserClient } from "@/infrastructure/supabase/browserClient";

type ResetPasswordFormProps = {
  allowSubmit: boolean;
};

export function ResetPasswordForm({ allowSubmit }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!allowSubmit) {
      setErrorMessage("Session recovery tidak ditemukan. Buka ulang link reset dari email.");
      return;
    }

    if (!password || !confirmPassword) {
      setErrorMessage("Isi password baru dan konfirmasinya.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password baru minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi password tidak sama.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMessage("Password baru belum berhasil disimpan. Coba buka ulang link reset dari email.");
      setIsLoading(false);
      return;
    }

    await supabase.auth.signOut();
    window.location.assign("/login?password_reset=1");
  }

  return (
    <form onSubmit={handleSubmit} method="post" className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Password baru</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimal 8 karakter"
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Konfirmasi password baru</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Ulangi password"
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading || !allowSubmit}
        className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isLoading ? "Menyimpan..." : "Simpan password baru"}
      </button>

      {errorMessage ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>
      ) : null}
    </form>
  );
}
