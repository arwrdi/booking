import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmailSignUpForm } from "@/components/auth/email-sign-up-form";
import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { buildVerifyEmailPath, getCurrentAuthState } from "@/infrastructure/supabase/auth";

export const metadata: Metadata = {
  title: "Register",
  description: "Registrasi email dan password untuk Booking MVP dengan verifikasi email.",
};

export default async function RegisterPage() {
  const { user, isEmailVerified } = await getCurrentAuthState();

  if (user && !isEmailVerified) {
    redirect(buildVerifyEmailPath(user.email, "/"));
  }

  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Register"
          title="Buat akun manual dengan email dan password."
          description="Akun baru wajib memverifikasi email sebelum bisa dipakai untuk login dan booking. Data dasar yang diminta: nama lengkap, nomor HP, email, dan password."
        />

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-xl font-semibold tracking-tight">Form registrasi</h2>
            <div className="mt-5">
              <EmailSignUpForm />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <p>Sudah punya akun?</p>
              <Link
                href="/login"
                className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-50"
              >
                Masuk di sini
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <StateCard
              title="Verifikasi email wajib"
              description="Setelah registrasi berhasil, Supabase akan mengirim link verifikasi ke inbox. Akun belum bisa dipakai sebelum link itu diklik."
            />
            <StateCard
              title="Profil otomatis dibuat"
              description="Trigger database `handle_new_user()` akan otomatis membuat baris `profiles` saat user baru dibuat."
            />
            <StateCard
              title="Nomor HP disimpan"
              description="Nomor HP dipakai sebagai data kontak booking dan fondasi untuk OTP/anti-fraud di tahap berikutnya."
            />
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
