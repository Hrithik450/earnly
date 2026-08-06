"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { profiles } from "@/lib/drizzle/schema";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import {
  forgotPasswordSchema,
  normalisePhone,
  otpSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations";

export type ActionResult = { error: string } | { ok: true };

/**
 * Creates the account and sends a 6-digit email OTP.
 *
 * The phone number rides along in user metadata and is copied into the profile
 * by the handle_new_user trigger. It is never verified — we run no SMS provider
 * — and nothing authenticates against it; it exists so withdrawals have a payout
 * destination.
 */
export async function signUp(formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details" };
  }

  const { email, phone, password, fullName } = parsed.data;

  /* Reject a phone already tied to another account. Two users sharing a payout
     number is the shape most refund fraud takes, and it is cheap to stop here.
     This SELECT exists only to produce a readable message: uniq_profile_phone is
     what actually enforces it, since two concurrent signups both pass this. */
  const phoneTaken = await db.query.profiles.findFirst({
    where: eq(profiles.phone, phone),
    columns: { id: true },
  });

  if (phoneTaken) {
    return {
      error: "That mobile number is already registered with another account.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { phone, full_name: fullName },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    /* handle_new_user runs inside the auth.users insert, so a phone collision
       that raced past the check above surfaces here as an opaque database
       error. Losing that race is the only way to reach it. */
    if (/database error/i.test(error.message)) {
      return {
        error: "That mobile number is already registered with another account.",
      };
    }
    return { error: error.message };
  }

  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

/** Confirms the signup OTP and, on success, leaves the user signed in. */
export async function verifyOtp(formData: FormData): Promise<ActionResult> {
  const parsed = otpSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid code" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "email",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Re-sends the signup OTP. */
export async function resendOtp(email: string): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return { error: "Enter a valid email" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
  });

  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Signs in with email or phone in one field.
 *
 * Phone is not an auth identity, so a phone entry is resolved to the account's
 * email first. That lookup runs on the privileged Drizzle connection, which is
 * why the failure message below is identical whether the account was not found
 * or the password was wrong — distinguishing them would turn this into an
 * oracle for which numbers are registered.
 */
export async function signIn(formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details" };
  }

  const { identifier, password } = parsed.data;
  const next = String(formData.get("next") ?? "/dashboard");

  let email = identifier.toLowerCase();

  if (!identifier.includes("@")) {
    const phone = normalisePhone(identifier);

    if (phone.length !== 10) {
      return { error: "Incorrect email/phone or password." };
    }

    const match = await db.query.profiles.findFirst({
      where: eq(profiles.phone, phone),
      columns: { email: true },
    });

    if (!match) {
      return { error: "Incorrect email/phone or password." };
    }

    email = match.email;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    /* Surface the unverified-email case specifically — it is the one failure the
       user can actually act on, and it reveals nothing they didn't just prove
       they know by supplying the right password. */
    if (error.code === "email_not_confirmed") {
      redirect(`/verify?email=${encodeURIComponent(email)}`);
    }
    return { error: "Incorrect email/phone or password." };
  }

  revalidatePath("/", "layout");

  /* Only relative paths, or `next` becomes an open redirect. */
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordReset(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email" };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/dashboard/profile`,
  });

  /* Always report success. Reporting "no such account" here would let anyone
     enumerate which emails are registered. */
  return { ok: true };
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your password" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { error: error.message };
  return { ok: true };
}
