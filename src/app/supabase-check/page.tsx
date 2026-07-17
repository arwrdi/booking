import Link from "next/link";

import { getSupabaseServerClient } from "@/infrastructure/supabase/serverClient";

type CheckStatus = "ok" | "warning" | "error";

function getStatusLabel(status: CheckStatus) {
  switch (status) {
    case "ok":
      return "OK";
    case "warning":
      return "Warning";
    case "error":
      return "Error";
  }
}

export default async function SupabaseCheckPage() {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("services")
    .select("id", { head: true, count: "exact" })
    .limit(1);

  let status: CheckStatus = "ok";
  let message =
    "Koneksi Supabase berhasil. Jika tabel services belum dibuat, kamu akan melihat warning di bawah.";

  if (error) {
    const code = (error as unknown as { code?: string }).code;
    const httpStatus = (error as unknown as { status?: number }).status;

    if (code === "42P01") {
      status = "warning";
      message =
        "Koneksi Supabase sudah terdeteksi, tapi tabel services belum ada. Ini normal kalau database schema belum dibuat.";
    } else if (httpStatus === 401 || httpStatus === 403) {
      status = "error";
      message =
        "Supabase menolak request (401/403). Biasanya karena URL/ANON key salah atau policy/permission belum diset.";
    } else {
      status = "warning";
      message = `Supabase merespons error: ${error.message}`;
    }
  }

  const statusLabel = getStatusLabel(status);
  const statusClass =
    status === "ok"
      ? "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20"
      : status === "warning"
        ? "bg-amber-500/10 text-amber-700 ring-amber-600/20"
        : "bg-rose-500/10 text-rose-700 ring-rose-600/20";

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Supabase Check
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Tes cepat untuk memastikan environment dan koneksi dasar sudah benar.
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${statusClass}`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 text-sm leading-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p>{message}</p>
          {error ? (
            <div className="mt-3 rounded-xl bg-zinc-950/5 p-3 text-xs text-zinc-700 dark:bg-white/5 dark:text-zinc-200">
              <div className="font-medium">Detail error</div>
              <div className="mt-1 break-words">{error.message}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Kembali ke Home
          </Link>
        </div>
      </main>
    </div>
  );
}

