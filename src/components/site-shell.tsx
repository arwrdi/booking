import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { getCurrentUser } from "@/infrastructure/supabase/auth";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/workers", label: "Workers" },
  { href: "/availability", label: "Availability" },
  { href: "/book", label: "Book" },
  { href: "/my-bookings", label: "My Bookings" },
  { href: "/supabase-check", label: "Supabase Check" },
];

type SiteShellProps = {
  children: ReactNode;
};

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

type StateCardProps = {
  title: string;
  description: string;
  tone?: "default" | "warning";
};

export async function SiteShell({ children }: SiteShellProps) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-zinc-900 dark:text-zinc-50">
            BOOKING MVP
          </Link>
          <div className="flex flex-col gap-3 lg:items-end">
            <nav className="flex flex-wrap items-center justify-start gap-2 text-sm text-zinc-600 dark:text-zinc-300 lg:justify-end">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-2 transition-colors hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-950"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              {user ? (
                <>
                  <div className="rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    Login sebagai {user.email ?? "user"}
                  </div>
                  <SignOutButton />
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  Masuk dengan Google
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">{children}</main>

      <footer className="border-t border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-5 text-sm text-zinc-600 dark:text-zinc-400">
          <p>Next.js + Supabase starter untuk booking flow MVP.</p>
          <p>Google Auth siap diuji sebelum flow booking private dibuat.</p>
        </div>
      </footer>
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: PageIntroProps) {
  return (
    <section className="flex flex-col gap-6 rounded-[2rem] border border-zinc-200 bg-white px-6 py-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">
          {eyebrow}
        </p>
        <div className="space-y-3">
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </section>
  );
}

export function StateCard({
  title,
  description,
  tone = "default",
}: StateCardProps) {
  const classes =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
      : "border-zinc-200 bg-white text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${classes}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 opacity-80">{description}</p>
    </div>
  );
}
