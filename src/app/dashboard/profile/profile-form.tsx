"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { InkButton, InkError, InkField } from "@/components/paper/form";
import { InterestsFields } from "@/components/paper/interests-fields";
import { updateProfile } from "@/lib/actions/redemptions";
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
        caption="So we can reach you about a redemption — we never send a code to it."
      />

      <InterestsFields
        disabled={pending}
        defaults={{
          industry: profile.industry,
          country: profile.country,
          state: profile.state,
          hobbies: profile.hobbies,
        }}
      />

      <InkButton type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </InkButton>
    </form>
  );
}
