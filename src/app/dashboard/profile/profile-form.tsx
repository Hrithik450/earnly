"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { InkButton, InkError, InkField } from "@/components/paper/form";
import { updateProfile } from "@/lib/actions/payouts";
import type { Profile } from "@/lib/drizzle/schema";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if ("error" in result) setError(result.error);
      else toast.success("Profile saved.");
    });
  }

  return (
    <form action={onSubmit} className="ink-card space-y-5 p-6">
      <InkError>{error}</InkError>

      <InkField
        label="Full name"
        name="fullName"
        defaultValue={profile.fullName ?? ""}
        autoComplete="name"
        required
        disabled={pending}
      />

      <div>
        <span className="mb-1.5 block text-sm font-semibold">Email</span>
        <input
          value={profile.email}
          readOnly
          disabled
          className="ink-input opacity-60"
        />
        <span className="caption mt-1.5 block text-xs">
          This is the address your account is verified against, so it can&rsquo;t
          be changed here.
        </span>
      </div>

      <InkField
        label="Mobile number"
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        defaultValue={profile.phone ?? ""}
        required
        disabled={pending}
        caption="Used for withdrawals only — we never send a code to it."
      />

      <div className="border-t-2 border-[var(--ink)] pt-5">
        <h2 className="text-xl">Where to pay you</h2>
        <p className="caption mt-1 text-sm">
          Add at least one. You pick which to use each time you withdraw.
        </p>
      </div>

      <InkField
        label="UPI ID"
        name="upiId"
        defaultValue={profile.upiId ?? ""}
        placeholder="name@okhdfcbank"
        disabled={pending}
        caption="Any UPI handle — GPay, PhonePe, Paytm or your bank's own."
      />

      <InkField
        label="Paytm number"
        name="paytmNumber"
        type="tel"
        inputMode="numeric"
        defaultValue={profile.paytmNumber ?? ""}
        placeholder="98765 43210"
        disabled={pending}
        caption="Leave blank if you'd rather be paid by UPI."
      />

      <InkButton type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </InkButton>
    </form>
  );
}
