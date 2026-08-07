"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { InkButton, InkError, InkField } from "@/components/paper/form";
import { signUp } from "@/lib/auth/actions";
import { OTP_LENGTH } from "@/lib/validations";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
        caption="So we can reach you about a gift card. No OTP is sent to it."
      />

      <InkField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        required
        disabled={pending}
        caption="8+ characters with an uppercase letter, a lowercase letter and a number."
      />

      <InkField
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter your password"
        required
        disabled={pending}
      />

      <InkButton type="submit" disabled={pending}>
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
