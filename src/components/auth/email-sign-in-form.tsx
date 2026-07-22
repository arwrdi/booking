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
          className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-powder-strong"
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
          className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-powder-strong"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Memproses..." : "Masuk dengan Email"}
      </button>

      {formState.error ? (
        <p className="text-sm text-danger-text">{formState.error}</p>
      ) : null}
    </form>
  );
}
