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
  title: "Masuk",
  description: "Masuk ke Dyvara Beauty Studio.",
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
      <div className="mx-auto w-full max-w-md space-y-6">
        <Suspense fallback={null}>
          <OAuthHashRecovery />
        </Suspense>

        <PageIntro
          hero
          eyebrow="Masuk"
          title="Selamat datang kembali"
          description="Masuk dengan email atau Google untuk melanjutkan booking."
        />

        <Suspense fallback={null}>
          <LoginNotice />
        </Suspense>

        {params.verified === "1" ? (
          <StateCard
            tone="success"
            title="Email terverifikasi"
            description="Silakan masuk untuk lanjut booking."
          />
        ) : null}

        {params.password_reset === "1" ? (
          <StateCard
            tone="success"
            title="Password diubah"
            description="Masuk dengan password baru."
          />
        ) : null}

        <section className="surface-card rounded-[1.75rem] p-5 sm:p-6">
          <EmailSignInForm nextPath={nextPath} />

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] text-muted">
              <span className="bg-surface px-3">atau</span>
            </div>
          </div>

          <GoogleSignInButton nextPath={nextPath} />

          <div className="mt-5 space-y-2 text-center text-sm text-muted">
            <p>
              Belum punya akun?{" "}
              <Link href="/register" className="font-semibold text-powder-strong">
                Daftar
              </Link>
            </p>
            <p>
              <Link href="/forgot-password" className="font-medium text-powder-strong">
                Lupa password?
              </Link>
              {" · "}
              <Link
                href={buildVerifyEmailPath("", nextPath)}
                className="font-medium text-powder-strong"
              >
                Kirim ulang verifikasi
              </Link>
            </p>
          </div>
        </section>

        {user ? (
          <StateCard
            tone="success"
            title={`Sudah masuk sebagai ${user.email ?? "user"}`}
            description="Kamu bisa langsung mulai booking."
          />
        ) : null}
      </div>
    </SiteShell>
  );
}
