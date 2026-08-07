"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { InkButton, InkError, InkField } from "@/components/paper/form";
import { InterestsFields } from "@/components/paper/interests-fields";
import { InkPasswordField } from "@/components/paper/password-field";
import { signUp } from "@/lib/auth/actions";
import { OTP_LENGTH } from "@/lib/validations";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, startTransition] = useTransition();

  /* Only once they have typed something into the second box — flagging a
     mismatch against an empty field would scold them mid-keystroke. The server
     re-checks this regardless; this is only to save a round-trip. */
  const mismatch =
    confirmPassword.length > 0 && password !== confirmPassword
      ? "Passwords do not match"
      : undefined;

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signUp(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <form action={onSubmit} className="ink-card space-y-5 p-6 sm:p-7">
      <div>
        <h1 className="text-3xl sm:text-4xl">Create your account</h1>
        <p className="caption mt-1.5 text-sm">
          We&rsquo;ll email you a {OTP_LENGTH}-digit code to confirm it&rsquo;s you.
        </p>
      </div>

      <InkError>{error}</InkError>

      <InkField
        label="Full name"
        name="fullName"
        autoComplete="name"
        placeholder="Your name"
        required
        disabled={pending}
      />

      <InkField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@email.com"
        required
        disabled={pending}
      />

      <InkField
        label="Mobile number"
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="98765 43210"
        required
        disabled={pending}
        caption="So we can reach you about a redemption. No OTP is sent to it."
      />

      <InterestsFields disabled={pending} />

      <InkPasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        required
        disabled={pending}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        caption="8+ characters with an uppercase letter, a lowercase letter and a number."
      />

      <InkPasswordField
        label="Confirm password"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Re-enter your password"
        required
        disabled={pending}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={mismatch}
      />

      <InkButton type="submit" disabled={pending || Boolean(mismatch)}>
        {pending ? "Creating account…" : "Create account"}
      </InkButton>

      <p className="caption text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
