"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { InkButton, InkError, InkField } from "@/components/paper/form";
import { signIn } from "@/lib/auth/actions";

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      /* A successful sign-in redirects, so this only ever resolves on failure. */
      const result = await signIn(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <form action={onSubmit} className="ink-card space-y-5 p-6 sm:p-7">
      <input type="hidden" name="next" value={next} />

      <div>
        <h1 className="text-3xl sm:text-4xl">Welcome back</h1>
        <p className="caption mt-1.5 text-sm">
          Sign in to pick up where you left off.
        </p>
      </div>

      <InkError>{error}</InkError>

      <InkField
        label="Email or mobile number"
        name="identifier"
        type="text"
        autoComplete="username"
        placeholder="you@email.com"
        required
        disabled={pending}
      />

      <div>
        <InkField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          disabled={pending}
        />
        <Link
          href="/forgot-password"
          className="caption mt-2 inline-block text-xs font-semibold underline"
        >
          Forgot your password?
        </Link>
      </div>

      <InkButton type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </InkButton>

      <p className="caption text-center text-sm">
        New here?{" "}
        <Link href="/signup" className="font-semibold underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
