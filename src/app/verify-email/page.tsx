import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { getCurrentAuthState } from "@/infrastructure/supabase/auth";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Halaman instruksi verifikasi email untuk auth manual di Booking MVP.",
};

const errorMessages: Record<string, string> = {
  email_unverified:
    "Session akun ini sudah ada, tetapi email-nya belum terverifikasi. Cek inbox lalu klik link verifikasi.",
};

type VerifyEmailPageProps = {
  searchParams: Promise<{
    email?: string;
    sent?: string;
    error?: string;
    next?: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const { user, isEmailVerified } = await getCurrentAuthState();
  const nextPath = params.next?.startsWith("/") ? params.next : "/";

  if (user && isEmailVerified) {
    redirect(nextPath);
  }

  const email = params.email ?? user?.email ?? "";
  const errorMessage = params.error ? errorMessages[params.error] : null;

  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Verify Email"
          title="Verifikasi email diperlukan sebelum akun bisa dipakai."
          description="Buka inbox email kamu, lalu klik link verifikasi dari Supabase Auth. Setelah sukses, kamu bisa kembali login atau langsung masuk ke app jika link membuka session baru."
        />

        {params.sent === "1" ? (
          <StateCard
            title="Email verifikasi sudah dikirim"
            description="Cek inbox dan folder spam. Kalau belum masuk, gunakan form kirim ulang di bawah."
          />
        ) : null}

        {errorMessage ? (
          <StateCard
            tone="warning"
            title="Email belum terverifikasi"
            description={errorMessage}
          />
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-xl font-semibold tracking-tight">Kirim ulang link verifikasi</h2>
            <div className="mt-5">
              <ResendVerificationForm initialEmail={email} />
            </div>
          </div>

          <div className="space-y-4">
            <StateCard
              title="Kalau daftar manual"
              description="Link verifikasi akan dikirim ke email yang dipakai saat signup email/password."
            />
            <StateCard
              title="Kalau login Google"
              description="Aplikasi tetap mengecek bahwa email dari provider sudah verified. Jika tidak, session login akan ditolak."
            />
            <StateCard
              title="Setelah verified"
              description="Kamu bisa lanjut ke halaman login dan masuk seperti biasa."
            />
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Kembali ke login
          </Link>
          <Link
            href="/register"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Kembali ke registrasi
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}
