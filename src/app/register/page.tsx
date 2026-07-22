import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmailSignUpForm } from "@/components/auth/email-sign-up-form";
import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";
import { buildVerifyEmailPath, getCurrentAuthState } from "@/infrastructure/supabase/auth";

export const metadata: Metadata = {
  title: "Daftar",
  description: "Buat akun Dyvara Beauty Studio.",
};

export default async function RegisterPage() {
  const { user, isEmailVerified } = await getCurrentAuthState();

  if (user && !isEmailVerified) {
    redirect(buildVerifyEmailPath(user.email, "/"));
  }

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-md space-y-6">
        <PageIntro
          hero
          eyebrow="Daftar"
          title="Buat akun baru"
          description="Isi data singkat, lalu verifikasi email sebelum mulai booking."
        />

        <section className="surface-card rounded-[1.75rem] p-5 sm:p-6">
          <EmailSignUpForm />
          <p className="mt-5 text-center text-sm text-muted">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-powder-strong">
              Masuk
            </Link>
          </p>
        </section>

        <StateCard
          title="Verifikasi email wajib"
          description="Setelah daftar, cek inbox untuk link verifikasi."
        />
      </div>
    </SiteShell>
  );
}
