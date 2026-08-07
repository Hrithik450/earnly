"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { profiles, redemptions } from "@/lib/drizzle/schema";
import { getGiftCard, isValidDenomination } from "@/lib/gift-cards";
import { getPendingRedemptionCoins } from "@/lib/queries";
import { profileSchema, redemptionSchema } from "@/lib/validations";

export type RedeemResult = { error: string } | { ok: true };

/** Saves the name and contact number. Email is deliberately not editable. */
export async function updateProfile(formData: FormData): Promise<RedeemResult> {
  const profile = await requireUser();

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details" };
  }

  const { fullName, phone } = parsed.data;

  await db
    .update(profiles)
    .set({ fullName, phone, updatedAt: new Date() })
    .where(eq(profiles.id, profile.id));

  revalidatePath("/dashboard/profile");

  return { ok: true };
}

/**
 * Files a request for a gift card.
 *
 * The balance is NOT debited here. Coins are debited only when an admin issues
 * the card, so a rejected request needs no reversal entry. What stops a user
 * spending the same coins twice is the pending-total check below.
 *
 * The brand name is snapshotted onto the request so the row still reads
 * correctly if that brand is later renamed or dropped from the catalogue.
 */
export async function requestRedemption(
  formData: FormData,
): Promise<RedeemResult> {
  const profile = await requireUser();

  const parsed = redemptionSchema.safeParse({
    brandId: formData.get("brandId"),
    amountCoins: formData.get("amountCoins"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your choice" };
  }

  const { brandId, amountCoins } = parsed.data;

  /* The posted amount decides the debit, so it is checked against the catalogue
     rather than trusted — otherwise a crafted form could claim a ₹5000 card for
     1 coin. */
  const brand = getGiftCard(brandId);
  if (!brand || !isValidDenomination(brandId, amountCoins)) {
    return { error: "That card isn't available. Pick one from the list." };
  }

  const locked = await getPendingRedemptionCoins(profile.id);
  const available = profile.coinsBalance - locked;

  if (amountCoins > available) {
    return {
      error:
        locked > 0
          ? `You have ${available} coins available — ${locked} are already in a pending request.`
          : `You only have ${available} coins.`,
    };
  }

  await db.insert(redemptions).values({
    userId: profile.id,
    brandId: brand.id,
    brandName: brand.name,
    amountCoins,
  });

  revalidatePath("/dashboard/redeem");
  revalidatePath("/dashboard");

  return { ok: true };
}

/**
 * Cancels a pending request. Nothing was debited, so this only releases the
 * lock — but the row id is matched against the caller's own id, or one user
 * could cancel another's request by guessing a uuid.
 */
export async function cancelRedemption(id: string): Promise<RedeemResult> {
  const profile = await requireUser();

  const request = await db.query.redemptions.findFirst({
    where: eq(redemptions.id, id),
  });

  if (!request || request.userId !== profile.id) {
    return { error: "That request no longer exists." };
  }

  if (request.status !== "pending") {
    return { error: "That request has already been processed." };
  }

  await db.delete(redemptions).where(eq(redemptions.id, id));

  revalidatePath("/dashboard/redeem");
  return { ok: true };
}
