"use client";

import { useSearchParams } from "next/navigation";

const errorMessages: Record<string, string> = {
  missing_code: "Callback Google tidak membawa authorization code. Coba ulangi login dari tombol Google.",
  oauth_callback_failed:
    "Pertukaran code ke session gagal. Periksa URL callback di Google dan Supabase Auth.",
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
