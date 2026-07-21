type GoogleSignInButtonProps = {
  nextPath?: string;
  className?: string;
};

function getSafeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

/**
 * Navigasi penuh ke route server `/auth/google`.
 * Pakai <a> biasa agar tetap redirect meski JS client gagal hydrate.
 */
export function GoogleSignInButton({
  nextPath,
  className,
}: GoogleSignInButtonProps) {
  const redirectPath = getSafeNextPath(nextPath);

  return (
    <a
      href={`/auth/google?next=${encodeURIComponent(redirectPath)}`}
      className={
        className ??
        "inline-flex h-11 w-full items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      }
    >
      Lanjut dengan Google
    </a>
  );
}
