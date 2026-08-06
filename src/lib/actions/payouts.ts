"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { profiles, withdrawals } from "@/lib/drizzle/schema";
import { getPendingWithdrawalPoints } from "@/lib/queries";
import { profileSchema, withdrawalSchema } from "@/lib/validations";

export type PayoutResult = { error: string } | { ok: true };

/** Saves the name and payout destinations. Email is deliberately not editable. */
export async function updateProfile(formData: FormData): Promise<PayoutResult> {
  const profile = await requireUser();

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    upiId: formData.get("upiId") ?? "",
    paytmNumber: formData.get("paytmNumber") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details" };
  }

  const { fullName, phone, upiId, paytmNumber } = parsed.data;

  await db
    .update(profiles)
    .set({
      fullName,
      phone,
      /* Empty string means "cleared", which is null in the column — otherwise a
         blank UPI field would later validate as a real destination. */
      upiId: upiId ? upiId : null,
      paytmNumber: paytmNumber ? paytmNumber : null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, profile.id));

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/withdraw");

  return { ok: true };
}

/**
 * Files a withdrawal request.
 *
 * The balance is NOT debited here. Points are debited only when an admin marks
 * the request paid, so a rejected request needs no reversal entry. What stops a
 * user requesting the same points twice is the pending-total check below.
 *
 * The destination is snapshotted onto the request: if the user edits their UPI
 * ID afterwards, the admin still pays the account that was actually requested.
 */
export async function requestWithdrawal(
  formData: FormData,
): Promise<PayoutResult> {
  const profile = await requireUser();

  const parsed = withdrawalSchema.safeParse({
    amountPoints: formData.get("amountPoints"),
    method: formData.get("method"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the amount" };
  }

  const { amountPoints, method } = parsed.data;

  const destination =
    method === "upi" ? profile.upiId : profile.paytmNumber;

  if (!destination) {
    return {
      error:
        method === "upi"
          ? "Add your UPI ID in your profile first."
          : "Add your Paytm number in your profile first.",
    };
  }

  const locked = await getPendingWithdrawalPoints(profile.id);
  const available = profile.pointsBalance - locked;

  if (amountPoints > available) {
    return {
      error:
        locked > 0
          ? `You have ${available} points available — ${locked} are already in a pending request.`
          : `You only have ${available} points.`,
    };
  }

  await db.insert(withdrawals).values({
    userId: profile.id,
    amountPoints,
    method,
    destination,
  });

  revalidatePath("/dashboard/withdraw");
  revalidatePath("/dashboard");

  return { ok: true };
}

/**
 * Cancels a pending request. Nothing was debited, so this only releases the
 * lock — but the row id is matched against the caller's own id, or one user
 * could cancel another's request by guessing a uuid.
 */
export async function cancelWithdrawal(id: string): Promise<PayoutResult> {
  const profile = await requireUser();

  const request = await db.query.withdrawals.findFirst({
    where: eq(withdrawals.id, id),
  });

  if (!request || request.userId !== profile.id) {
    return { error: "That request no longer exists." };
  }

  if (request.status !== "pending") {
    return { error: "That request has already been processed." };
  }

  await db.delete(withdrawals).where(eq(withdrawals.id, id));

  revalidatePath("/dashboard/withdraw");
  return { ok: true };
}
