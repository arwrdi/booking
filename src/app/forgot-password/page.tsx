import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Lupa password",
  description: "Reset password Dyvara Beauty Studio.",
};

export default function ForgotPasswordPage() {
  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-md space-y-6">
        <PageIntro
          hero
          eyebrow="Reset"
          title="Lupa password?"
          description="Masukkan email akun, kami kirim link reset."
        />
        <section className="surface-card rounded-[1.75rem] p-5 sm:p-6">
          <ForgotPasswordForm />
          <p className="mt-4 text-center text-sm text-muted">
            <Link href="/login" className="font-semibold text-powder-strong">
              Kembali masuk
            </Link>
          </p>
        </section>
        <StateCard title="Cek spam" description="Kadang email recovery masuk folder spam." />
      </div>
    </SiteShell>
  );
}
