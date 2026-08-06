"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { InkButton, InkError, InkField } from "@/components/paper/form";
import { resendOtp, verifyOtp } from "@/lib/auth/actions";
import { OTP_LENGTH } from "@/lib/validations";

export function VerifyForm({ email }: { email: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await verifyOtp(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  function onResend() {
    startResend(async () => {
      const result = await resendOtp(email);
      if ("error" in result) toast.error(result.error);
      else toast.success("New code sent — check your inbox.");
    });
  }

  return (
    <form action={onSubmit} className="ink-card space-y-5 p-6 sm:p-7">
      <input type="hidden" name="email" value={email} />

      <div>
        <h1 className="text-3xl sm:text-4xl">Check your email</h1>
        <p className="caption mt-1.5 text-sm">
          We sent a {OTP_LENGTH}-digit code to{" "}
          <span className="font-semibold" style={{ color: "var(--ink)" }}>
            {email}
          </span>
          .
        </p>
      </div>

      <InkError>{error}</InkError>

      <InkField
        label="Verification code"
        name="token"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        placeholder={Array.from({ length: OTP_LENGTH }, (_, i) => (i + 1) % 10).join("")}
        required
        autoFocus
        disabled={pending}
        /* Looser tracking than the digits deserve, so eight of them still fit
           on a narrow phone without the field scrolling. */
        className="mono text-center text-2xl tracking-[0.25em]"
      />

      <InkButton type="submit" disabled={pending}>
        {pending ? "Verifying…" : "Verify and continue"}
      </InkButton>

      <button
        type="button"
        onClick={onResend}
        disabled={resending}
        className="caption w-full text-center text-sm font-semibold underline disabled:opacity-50"
      >
        {resending ? "Sending…" : "Didn't get it? Send a new code"}
      </button>
    </form>
  );
}
