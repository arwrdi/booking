import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Kirim link reset password untuk akun Booking MVP.",
};

export default function ForgotPasswordPage() {
  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Reset Password"
          title="Minta link reset password lewat email."
          description="Masukkan email akun yang terdaftar. Supabase akan mengirim link recovery ke inbox, lalu kamu bisa membuat password baru dari link itu."
        />

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-xl font-semibold tracking-tight">Kirim email reset</h2>
            <div className="mt-5">
              <ForgotPasswordForm />
            </div>
          </div>

          <div className="space-y-4">
            <StateCard
              title="Link recovery"
              description="Email reset akan mengarahkan user ke callback auth lalu diteruskan ke halaman set password baru."
            />
            <StateCard
              title="Tidak mengubah verifikasi email"
              description="Flow reset password hanya mengganti password. Aturan verifikasi email tetap berlaku untuk akses area private."
            />
            <StateCard
              title="Cek folder spam"
              description="Kalau email reset belum masuk, cek folder spam atau kirim ulang dari halaman ini."
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
        </div>
      </div>
    </SiteShell>
  );
}
