"use client";

import { useState } from "react";

import { getSupabaseBrowserClient } from "@/infrastructure/supabase/browserClient";

function buildEmailRedirectUrl() {
  const redirectTo = new URL("/auth/callback", window.location.origin);
  redirectTo.searchParams.set("next", "/login?verified=1");
  return redirectTo.toString();
}

function getFriendlySignUpError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("user already registered")) {
    return "Email ini sudah terdaftar. Coba login atau kirim ulang email verifikasi.";
  }

  if (normalized.includes("password")) {
    return "Password belum memenuhi syarat minimum dari Supabase Auth.";
  }

  return "Registrasi belum berhasil. Coba lagi sebentar lagi.";
}

export function EmailSignUpForm() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedPhone || !trimmedEmail || !password || !confirmPassword) {
      setErrorMessage("Isi semua field registrasi terlebih dulu.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi password tidak sama.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: buildEmailRedirectUrl(),
        data: {
          full_name: trimmedName,
          phone: trimmedPhone,
        },
      },
    });

    if (error) {
      setErrorMessage(getFriendlySignUpError(error.message));
      setIsLoading(false);
      return;
    }

    window.location.assign(`/verify-email?email=${encodeURIComponent(trimmedEmail)}&sent=1`);
  }

  return (
    <form onSubmit={handleSubmit} method="post" className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Nama lengkap</span>
        <input
          type="text"
          name="fullName"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Nama lengkap"
          className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Nomor HP / WhatsApp</span>
        <input
          type="tel"
          name="phone"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="08xxxxxxxxxx"
          className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
        />
      </label>

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

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimal 8 karakter"
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Konfirmasi password</span>
          <input
            type="password"
            name="confirmPassword"
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
        disabled={isLoading}
        className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isLoading ? "Mendaftarkan..." : "Buat akun baru"}
      </button>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Setelah submit, sistem akan mengirim link verifikasi ke email kamu.
      </p>

      {errorMessage ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>
      ) : null}
    </form>
  );
}
