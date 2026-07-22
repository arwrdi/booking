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
        "btn-primary w-full"
      }
    >
      Lanjut dengan Google
    </a>
  );
}
