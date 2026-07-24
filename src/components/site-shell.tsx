import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { NavIcon, type NavIconName } from "@/components/nav-icon";
import {
  buildVerifyEmailPath,
  getCurrentAuthState,
  getCurrentProfile,
} from "@/infrastructure/supabase/auth";

const desktopNav = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Layanan" },
  { href: "/workers", label: "Worker" },
  { href: "/book", label: "Booking" },
  { href: "/my-bookings", label: "Pesanan" },
];

const mobileNav: { href: string; label: string; icon: NavIconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/book", label: "Booking", icon: "book" },
  { href: "/my-bookings", label: "Pesanan", icon: "orders" },
];
type SiteShellProps = {
  children: ReactNode;
};

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  hero?: boolean;
};

type StateCardProps = {
  title: string;
  description: string;
  tone?: "default" | "warning" | "success";
};

export async function SiteShell({ children }: SiteShellProps) {
  const [{ user, isEmailVerified }, profile] = await Promise.all([
    getCurrentAuthState(),
    getCurrentProfile(),
  ]);

  const isAdmin = profile?.role === "admin";
  const desktopItems = isAdmin
    ? [...desktopNav, { href: "/admin", label: "Admin" }]
    : desktopNav;
  const bottomItems: { href: string; label: string; icon: NavIconName }[] = user
    ? isAdmin
      ? [...mobileNav, { href: "/admin", label: "Admin", icon: "admin" }]
      : mobileNav
    : [...mobileNav.slice(0, 2), { href: "/login", label: "Masuk", icon: "login" }];

  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="min-w-0">
            <span className="font-display text-2xl font-semibold tracking-tight text-rose-mauve sm:text-3xl">
              Dyvara
            </span>
            <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.2em] text-dusty-rose">
              Beauty Studio
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {desktopItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-lilac-soft hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden max-w-[10rem] truncate rounded-full bg-lilac-soft px-3 py-1.5 text-xs font-medium text-foreground sm:inline">
                  {user.email}
                </span>
                {!isEmailVerified ? (
                  <Link
                    href={buildVerifyEmailPath(user.email, "/")}
                    className="hidden h-10 items-center rounded-full bg-warning px-3 text-xs font-semibold text-warning-text sm:inline-flex"
                  >
                    Verifikasi
                  </Link>
                ) : null}
                <SignOutButton className="btn-secondary h-10 px-3 text-xs sm:text-sm" />
              </>
            ) : (
              <Link href="/login" className="btn-primary hidden sm:inline-flex">
                Masuk
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 pb-28 sm:px-6 sm:py-10 lg:pb-10">
        {children}
      </main>

      <footer className="hidden border-t border-border bg-surface/70 lg:block">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-5 text-sm text-muted">
          <p>Dyvara — Beauty Studio</p>
          <p>Booking layanan dengan worker pilihanmu.</p>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1">
          {bottomItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-14 min-w-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-semibold text-muted transition-colors active:bg-lilac-soft active:text-rose-mauve"
            >
              <NavIcon name={item.icon} className="h-5 w-5 text-rose-mauve" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  hero = false,
}: PageIntroProps) {
  return (
    <section
      className={
        hero
          ? "flex flex-col gap-5"
          : "surface-card flex flex-col gap-5 rounded-[1.75rem] px-5 py-6 sm:rounded-[2rem] sm:px-6 sm:py-8"
      }
    >
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-powder-strong">
          {eyebrow}
        </p>
        <div className="space-y-3">
          <h1
            className={`font-display font-semibold tracking-tight text-foreground ${
              hero ? "max-w-xl text-4xl sm:text-5xl" : "max-w-3xl text-3xl sm:text-4xl"
            }`}
          >
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted">{description}</p>
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
      ? "border-warning bg-warning/60 text-warning-text"
      : tone === "success"
        ? "border-success bg-success/50 text-success-text"
        : "border-border bg-surface text-foreground";

  return (
    <div className={`rounded-3xl border p-5 shadow-[var(--shadow-soft)] ${classes}`}>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 opacity-90">{description}</p> : null}
    </div>
  );
}
