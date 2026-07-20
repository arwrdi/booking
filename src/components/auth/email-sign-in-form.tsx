"use client";

import { useActionState, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { signInWithEmail, type LoginFormState } from "@/app/login/actions";

type EmailSignInFormProps = {
  nextPath?: string;
};

function getSafeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

export function EmailSignInForm({ nextPath }: EmailSignInFormProps) {
  const searchParams = useSearchParams();
  const [formState, formAction, isPending] = useActionState<LoginFormState, FormData>(
    signInWithEmail,
    {
      error: null,
    },
  );

  const redirectPath = useMemo(() => {
    return getSafeNextPath(nextPath ?? searchParams.get("next"));
  }, [nextPath, searchParams]);

  return (
    <form action={formAction} method="post" className="space-y-4">
      <input type="hidden" name="nextPath" value={redirectPath} />

      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="nama@email.com"
          className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="Masukkan password"
          className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isPending ? "Memproses..." : "Masuk dengan Email"}
      </button>

      {formState.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{formState.error}</p>
      ) : null}
    </form>
  );
}
