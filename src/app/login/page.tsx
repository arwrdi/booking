import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { EmailSignInForm } from "@/components/auth/email-sign-in-form";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LoginNotice } from "@/components/auth/login-notice";
import { OAuthHashRecovery } from "@/components/auth/oauth-hash-recovery";
import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { buildVerifyEmailPath, getCurrentAuthState } from "@/infrastructure/supabase/auth";

export const metadata: Metadata = {
  title: "Login",
  description: "Masuk ke Booking MVP dengan email/password atau Google Auth via Supabase.",
};

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    verified?: string;
    password_reset?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const { user, isEmailVerified } = await getCurrentAuthState();
  const nextPath = params.next?.startsWith("/") ? params.next : "/";

  if (user && !isEmailVerified) {
    redirect(buildVerifyEmailPath(user.email, nextPath));
  }

  return (
    <SiteShell>
      <div className="space-y-8">
        <Suspense fallback={null}>
          <OAuthHashRecovery />
        </Suspense>
        <PageIntro
          eyebrow="Auth"
          title="Masuk dengan email atau Google untuk mulai memakai flow booking private."
          description="Semua akun harus memakai email yang terverifikasi. Untuk registrasi manual, Supabase akan mengirim link verifikasi ke inbox. Untuk Google, app hanya menerima akun dengan email provider yang sudah verified."
        />

        <Suspense fallback={null}>
          <LoginNotice />
        </Suspense>

        {params.verified === "1" ? (
          <StateCard
            title="Email berhasil diverifikasi"
            description="Verifikasi email sudah selesai. Sekarang kamu bisa login dan lanjut ke flow booking."
          />
        ) : null}

        {params.password_reset === "1" ? (
          <StateCard
            title="Password berhasil direset"
            description="Password baru sudah tersimpan. Silakan login lagi dengan password yang baru."
          />
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-xl font-semibold tracking-tight">Masuk ke akun</h2>
            <div className="mt-5 space-y-6">
              <EmailSignInForm nextPath={nextPath} />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] text-zinc-500">
                  <span className="bg-white px-3 dark:bg-zinc-950">atau</span>
                </div>
              </div>

              <GoogleSignInButton nextPath={nextPath} />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <p>Belum punya akun?</p>
              <Link
                href="/register"
                className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-50"
              >
                Buat akun baru
              </Link>
              <span>atau</span>
              <Link
                href={buildVerifyEmailPath("", nextPath)}
                className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-50"
              >
                kirim ulang email verifikasi
              </Link>
              <span>atau</span>
              <Link
                href="/forgot-password"
                className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-50"
              >
                reset password
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <StateCard
              title="Login manual"
              description="User bisa masuk memakai email dan password setelah email pada akun tersebut diverifikasi."
            />
            <StateCard
              title="Google tetap dicek"
              description="Setelah OAuth selesai, app akan mengecek `email_confirmed_at`. Jika provider tidak mengirim email verified, session akan ditolak."
            />
            <StateCard
              title="Setup Supabase"
              description="Pastikan `Confirm email` aktif di Supabase Auth agar registrasi manual benar-benar mengirim link verifikasi."
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-xl font-semibold tracking-tight">Status login saat ini</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {user ? (
                <>
                  <div className="rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:text-emerald-300">
                    Sudah login sebagai {user.email ?? "user"}
                  </div>
                  <Link
                    href="/"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  >
                    Kembali ke home
                  </Link>
                </>
              ) : (
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  Belum ada session aktif. Login dengan salah satu metode di atas untuk lanjut ke halaman private.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <StateCard
              title="Redirect URL"
              description="Di Supabase Auth → URL Configuration, set Site URL ke domain publik (mis. ngrok) dan tambahkan Redirect URL `https://domain-anda/auth/callback`."
            />
            <StateCard
              title="Trigger profiles"
              description="Saat user baru dibuat lewat email/password atau Google, trigger `handle_new_user()` akan membuat baris `profiles` secara otomatis."
            />
            <StateCard
              title="RLS setelah login"
              description="Begitu session aktif dan email sudah verified, tabel `profiles` dan `bookings` bisa dibatasi per-user dengan `auth.uid()`."
            />
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
