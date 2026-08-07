"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { profiles, redemptions } from "@/lib/drizzle/schema";
import { getGiftCard, isValidDenomination } from "@/lib/gift-cards";
import { MAX_UPI_COINS, MIN_UPI_COINS } from "@/lib/payout-methods";
import {
  getPendingRedemptionCoins,
  isGiftCardBrandEnabled,
  isPayoutMethodEnabled,
} from "@/lib/queries";
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
 * Files a redemption request, for either a gift card or a UPI transfer.
 *
 * The balance is NOT debited here. Coins are debited only when an admin
 * fulfils the request, so a rejected one needs no reversal entry. What stops a
 * user spending the same coins twice is the pending-total check below.
 *
 * Whether a method is even open is re-read from the database rather than
 * trusted from the form: the admin may have switched UPI off while this page
 * sat open in a tab, and a request filed after that would be one nobody intends
 * to pay.
 */
export async function requestRedemption(
  formData: FormData,
): Promise<RedeemResult> {
  const profile = await requireUser();

  const parsed = redemptionSchema.safeParse({
    method: formData.get("method"),
    brandId: formData.get("brandId"),
    upiId: formData.get("upiId"),
    amountCoins: formData.get("amountCoins"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your choice" };
  }

  const input = parsed.data;

  if (!(await isPayoutMethodEnabled(input.method))) {
    return {
      error: "That way of redeeming isn't available right now. Pick another.",
    };
  }

  /* Resolved per method: what the row records, and — the part that matters —
     how many coins the request costs. Both are derived here rather than taken
     from the form. */
  let row: {
    brandId: string;
    brandName: string;
    upiId: string | null;
  };

  if (input.method === "gift_card") {
    /* The posted amount decides the debit, so it is checked against the
       catalogue rather than trusted — otherwise a crafted form could claim a
       ₹5000 card for 1 coin. */
    const brand = getGiftCard(input.brandId);
    if (!brand || !isValidDenomination(input.brandId, input.amountCoins)) {
      return { error: "That card isn't available. Pick one from the list." };
    }

    /* Re-read for the same reason the method is: an admin may have pulled this
       brand while the page sat open. */
    if (!(await isGiftCardBrandEnabled(brand.id))) {
      return { error: `${brand.name} cards aren't available right now.` };
    }

    row = { brandId: brand.id, brandName: brand.name, upiId: null };
  } else {
    /* UPI has no fixed denominations, so the amount is bounded here instead.
       Without this a single request could drain a balance built by fraud before
       anyone looked at it. */
    if (input.amountCoins < MIN_UPI_COINS) {
      return { error: `The smallest UPI transfer is ${MIN_UPI_COINS} coins.` };
    }
    if (input.amountCoins > MAX_UPI_COINS) {
      return {
        error: `The largest single UPI transfer is ${MAX_UPI_COINS.toLocaleString("en-IN")} coins. Split it across two requests.`,
      };
    }

    row = { brandId: "upi", brandName: "UPI transfer", upiId: input.upiId };
  }

  const locked = await getPendingRedemptionCoins(profile.id);
  const available = profile.coinsBalance - locked;

  if (input.amountCoins > available) {
    return {
      error:
        locked > 0
          ? `You have ${available} coins available — ${locked} are already in a pending request.`
          : `You only have ${available} coins.`,
    };
  }

  await db.insert(redemptions).values({
    userId: profile.id,
    method: input.method,
    brandId: row.brandId,
    brandName: row.brandName,
    upiId: row.upiId,
    amountCoins: input.amountCoins,
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
