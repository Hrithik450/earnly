"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { InkButton, InkError } from "@/components/paper/form";
import { InkPasswordField } from "@/components/paper/password-field";
import { updatePassword } from "@/lib/auth/actions";

/**
 * Sets a new password after a recovery link.
 *
 * Reachable only with the recovery session that /auth/callback established — the
 * link signs the user in, and updateUser derives whose password to change from
 * that session, which is why no token is carried in this form.
 */
export function ResetForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, startTransition] = useTransition();

  const mismatch =
    confirmPassword.length > 0 && password !== confirmPassword
      ? "Passwords do not match"
      : undefined;

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updatePassword(formData);
      if ("error" in result) setError(result.error);
      else setDone(true);
    });
  }

  if (done) {
    return (
      <div className="ink-card space-y-4 p-6 sm:p-7">
        <h1 className="text-3xl sm:text-4xl">Password updated</h1>
        <p className="caption text-sm">
          You&rsquo;re signed in and ready to go.
        </p>
        {/* The recovery link already signed them in, so this goes straight to
            the dashboard rather than back through /login. refresh() is needed
            because the layout's server-rendered session is now stale. */}
        <InkButton
          type="button"
          onClick={() => {
            router.replace("/dashboard");
            router.refresh();
          }}
        >
          Go to dashboard
        </InkButton>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="ink-card space-y-5 p-6 sm:p-7">
      <div>
        <h1 className="text-3xl sm:text-4xl">Set a new password</h1>
        <p className="caption mt-1.5 text-sm">
          Choose something you haven&rsquo;t used here before.
        </p>
      </div>

      <InkError>{error}</InkError>

      <InkPasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        caption="Needs an uppercase letter, a lowercase letter and a number."
        required
        autoFocus
        disabled={pending}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <InkPasswordField
        label="Confirm new password"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Type it again"
        required
        disabled={pending}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={mismatch}
      />

      <InkButton type="submit" disabled={pending || Boolean(mismatch)}>
        {pending ? "Saving…" : "Save new password"}
      </InkButton>

      <p className="caption text-center text-sm">
        <Link href="/login" className="font-semibold underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
