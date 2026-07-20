"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

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

export function GoogleSignInButton({
  nextPath,
  className,
}: GoogleSignInButtonProps) {
  const searchParams = useSearchParams();

  const redirectPath = useMemo(() => {
    return getSafeNextPath(nextPath ?? searchParams.get("next"));
  }, [nextPath, searchParams]);

  return (
    <Link
      href={`/auth/google?next=${encodeURIComponent(redirectPath)}`}
      className={
        className ??
        "inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      }
    >
      Lanjut dengan Google
    </Link>
  );
}
