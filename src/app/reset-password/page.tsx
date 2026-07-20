import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { getCurrentAuthState } from "@/infrastructure/supabase/auth";

export const metadata: Metadata = {
  title: "Set New Password",
  description: "Set password baru setelah membuka link recovery dari email.",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{
    recovery?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const { user } = await getCurrentAuthState();
  const allowSubmit = Boolean(user && params.recovery === "1");

  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Recovery"
          title="Buat password baru untuk akun kamu."
          description="Halaman ini dipakai setelah user membuka link recovery dari email reset password."
        />

        {!allowSubmit ? (
          <StateCard
            tone="warning"
            title="Link recovery belum aktif"
            description="Buka ulang link reset password dari email terbaru. Halaman ini perlu session recovery yang dibuat oleh Supabase."
          />
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-xl font-semibold tracking-tight">Password baru</h2>
            <div className="mt-5">
              <ResetPasswordForm allowSubmit={allowSubmit} />
            </div>
          </div>

          <div className="space-y-4">
            <StateCard
              title="Setelah berhasil"
              description="Session recovery akan diakhiri dan user diarahkan kembali ke login dengan notifikasi sukses."
            />
            <StateCard
              title="Syarat password"
              description="Gunakan password minimal 8 karakter agar sesuai dengan flow auth yang sekarang."
            />
            <StateCard
              title="Kalau link expired"
              description="Minta link baru dari halaman forgot password lalu ulangi proses reset."
            />
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/forgot-password"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Minta link reset baru
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Kembali ke login
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}
