import type { Metadata } from "next";
import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LoginNotice } from "@/components/auth/login-notice";
import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { getCurrentUser } from "@/infrastructure/supabase/auth";

export const metadata: Metadata = {
  title: "Login",
  description: "Masuk ke Booking MVP dengan Google Auth via Supabase.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Google Auth"
          title="Masuk dengan Google untuk mulai menguji flow booking private."
          description="Setelah login berhasil, Supabase akan membuat session cookie dan trigger database akan otomatis membuat baris `profiles` untuk user baru."
        />

        <LoginNotice />

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-xl font-semibold tracking-tight">Langkah pengujian</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              <p>1. Pastikan provider Google sudah aktif di dashboard Supabase Auth.</p>
              <p>2. Tambahkan redirect URL callback ke `/auth/callback` di project ini.</p>
              <p>3. Klik tombol login di bawah lalu selesaikan OAuth Google.</p>
              <p>4. Setelah kembali ke app, header akan menampilkan email user yang aktif.</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
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
                <GoogleSignInButton />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <StateCard
              title="Redirect URL Google"
              description="Tambahkan URL callback berikut di Supabase Auth Provider Settings: `http://localhost:3000/auth/callback` untuk local development."
            />
            <StateCard
              title="Trigger profiles"
              description="Saat user baru login, trigger `handle_new_user()` akan membuat baris `profiles` secara otomatis."
            />
            <StateCard
              title="RLS setelah login"
              description="Begitu session aktif, tabel `profiles` dan `bookings` mulai bisa dibatasi per-user dengan `auth.uid()`."
            />
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
