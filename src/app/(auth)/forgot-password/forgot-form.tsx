"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { InkButton, InkError, InkField } from "@/components/paper/form";
import { requestPasswordReset } from "@/lib/auth/actions";

export function ForgotForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordReset(formData);
      if ("error" in result) setError(result.error);
      else setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="ink-card space-y-3 p-6 sm:p-7">
        <h1 className="text-3xl sm:text-4xl">Link sent</h1>
        <p className="caption text-sm">
          If that email has an account, a reset link is on its way. Open it on
          this device and you&rsquo;ll be able to set a new password.
        </p>
        <Link href="/login" className="text-sm font-semibold underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="ink-card space-y-5 p-6 sm:p-7">
      <div>
        <h1 className="text-3xl sm:text-4xl">Reset your password</h1>
        <p className="caption mt-1.5 text-sm">
          Enter your email and we&rsquo;ll send you a link to set a new one.
        </p>
      </div>

      <InkError>{error}</InkError>

      <InkField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@email.com"
        required
        disabled={pending}
      />

      <InkButton type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </InkButton>

      <p className="caption text-center text-sm">
        <Link href="/login" className="font-semibold underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
