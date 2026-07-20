"use client";

import { useFormStatus } from "react-dom";

import { signOut } from "@/app/auth/actions";

type SignOutButtonProps = {
  className?: string;
};

function SubmitButton({ className }: SignOutButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
      }
    >
      {pending ? "Keluar..." : "Sign out"}
    </button>
  );
}

export function SignOutButton({ className }: SignOutButtonProps) {
  return (
    <form action={signOut}>
      <SubmitButton className={className} />
    </form>
  );
}
