"use client";

import { useSearchParams } from "next/navigation";

const errorMessages: Record<string, string> = {
  oauth_start_failed:
    "URL login Google tidak berhasil dibuat. Periksa konfigurasi provider Google dan URL callback di Supabase.",
  missing_code:
    "Callback Google mengirim token di hash URL (bukan code). Pastikan Redirect URLs di Supabase berisi `https://domain-anda/auth/callback`, lalu ulangi login dari tombol Google.",
  oauth_callback_failed:
    "Pertukaran code ke session gagal. Biasanya karena PKCE verifier hilang atau Redirect URL di Supabase belum cocok.",
  oauth_email_unverified:
    "Akun yang digunakan belum punya email terverifikasi dari provider. Gunakan akun dengan email yang sudah verified.",
  email_unverified:
    "Email akun ini belum terverifikasi. Cek inbox lalu klik link verifikasi terlebih dulu.",
};

export function LoginNotice() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (!error) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
      <p className="font-semibold">Login belum berhasil</p>
      <p className="mt-2">
        {errorMessages[error] ??
          "Terjadi kendala saat login. Periksa konfigurasi provider Google dan Supabase."}
      </p>
    </div>
  );
}
