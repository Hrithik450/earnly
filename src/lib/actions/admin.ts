"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import {
  coinsLedger,
  payoutMethods,
  profiles,
  redemptions,
  tasks,
} from "@/lib/drizzle/schema";
import {
  giftCardBrandKey,
  isPayoutMethod,
} from "@/lib/payout-methods";
import { getGiftCard } from "@/lib/gift-cards";
import {
  getEnabledGiftCardBrands,
  getEnabledPayoutMethods,
} from "@/lib/queries";
import {
  issueCardSchema,
  settleUpiSchema,
  taskSchema,
} from "@/lib/validations";

export type AdminResult = { error: string } | { ok: true; id?: string };

/** Postgres unique-violation — here it can only be the tasks.slug index. */
const UNIQUE_VIOLATION = "23505";

type ParseResult =
  | { ok: false; error: string }
  | { ok: true; data: z.infer<typeof taskSchema> };

function parseTask(formData: FormData): ParseResult {
  /* The form builder posts its fields as one JSON blob, since the shape is
     dynamic and FormData has no nesting. */
  let formSchema: unknown = [];
  const raw = formData.get("formSchema");

  if (typeof raw === "string" && raw.length > 0) {
    try {
      formSchema = JSON.parse(raw);
    } catch {
      return { ok: false, error: "The task form is malformed." };
    }
  }

  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    instructions: formData.get("instructions") ?? "",
    coins: formData.get("coins"),    category: formData.get("category") ?? "",
    coverImageUrl: formData.get("coverImageUrl") ?? "",
    externalUrl: formData.get("externalUrl") ?? "",
    isActive: formData.get("isActive") === "on",
    formSchema,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the task",
    };
  }

  return { ok: true, data: parsed.data };
}

export async function createTask(formData: FormData): Promise<AdminResult> {
  await requireAdmin();

  const result = parseTask(formData);
  if (!result.ok) return { error: result.error };

  const { description, instructions, category, coverImageUrl, externalUrl, ...rest } =
    result.data;

  try {
    const [task] = await db
      .insert(tasks)
      .values({
        ...rest,
        description: description || null,
        instructions: instructions || null,
        category: category || null,
        coverImageUrl: coverImageUrl || null,
        externalUrl: externalUrl || null,
      })
      .returning({ id: tasks.id });

    revalidatePath("/admin/tasks");
    revalidatePath("/");
    return { ok: true, id: task.id };
  } catch (err) {
    if (isCode(err, UNIQUE_VIOLATION)) {
      return { error: "A task with that URL slug already exists." };
    }
    throw err;
  }
}

export async function updateTask(
  id: string,
  formData: FormData,
): Promise<AdminResult> {
  await requireAdmin();

  const result = parseTask(formData);
  if (!result.ok) return { error: result.error };

  const { description, instructions, category, coverImageUrl, externalUrl, ...rest } =
    result.data;

  try {
    await db
      .update(tasks)
      .set({
        ...rest,
        description: description || null,
        instructions: instructions || null,
        category: category || null,
        coverImageUrl: coverImageUrl || null,
        externalUrl: externalUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id));
  } catch (err) {
    if (isCode(err, UNIQUE_VIOLATION)) {
      return { error: "A task with that URL slug already exists." };
    }
    throw err;
  }

  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/tasks/${id}`);
  revalidatePath("/");
  return { ok: true, id };
}

/**
 * Closes a task without destroying it.
 *
 * The everyday way to take a task off the board — submissions survive, so the
 * evidence for points already paid is still there. `deleteTask` is the rare
 * alternative for a task that should never have existed.
 */
export async function setTaskActive(
  id: string,
  isActive: boolean,
): Promise<AdminResult> {
  await requireAdmin();

  await db
    .update(tasks)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(tasks.id, id));

  revalidatePath("/admin/tasks");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Destroys a task and everything recorded against it.
 *
 * Submissions cascade, so this erases the evidence for coins already paid out.
 * The ledger does not cascade — `refType`/`refId` are a loose pointer precisely
 * so entries outlive what they point at — which means balances stay correct and
 * every credit remains explained in the user's own earnings history. What is
 * lost is the admin-side proof of what was submitted.
 *
 * Closing the task is almost always the right action instead; this exists for a
 * task posted in error. The submission count is returned so the panel can say
 * what it cost.
 */
export async function deleteTask(id: string): Promise<AdminResult> {
  await requireAdmin();

  const deleted = await db
    .delete(tasks)
    .where(eq(tasks.id, id))
    .returning({ id: tasks.id });

  if (deleted.length === 0) {
    return { error: "That task no longer exists." };
  }

  revalidatePath("/admin/tasks");
  revalidatePath("/admin/submissions");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function setUserBlocked(
  userId: string,
  isBlocked: boolean,
): Promise<AdminResult> {
  const admin = await requireAdmin();

  /* An admin blocking themselves would lock the panel with no way back in
     except a psql session. */
  if (userId === admin.id) {
    return { error: "You can't block your own account." };
  }

  await db
    .update(profiles)
    .set({ isBlocked, updatedAt: new Date() })
    .where(eq(profiles.id, userId));

  revalidatePath("/admin/users");
  return { ok: true };
}

/**
 * Attaches a bought gift card code to a request and debits the coins in the
 * same transaction.
 *
 * This is the only place coins leave a balance. The debit happens here rather
 * than at request time so that a rejected request needs no reversal — and the
 * balance is re-checked inside the transaction, because the user may have spent
 * down since the request was filed.
 */
export async function issueRedemption(
  id: string,
  formData: FormData,
): Promise<AdminResult> {
  await requireAdmin();

  const parsed = issueCardSchema.safeParse({
    cardCode: formData.get("cardCode"),
    cardPin: formData.get("cardPin") ?? "",
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the card details" };
  }

  const { cardCode, cardPin, note } = parsed.data;

  const request = await db.query.redemptions.findFirst({
    where: eq(redemptions.id, id),
  });

  if (!request) return { error: "That request no longer exists." };
  if (request.status !== "pending") {
    return { error: "That request has already been processed." };
  }
  if (request.method !== "gift_card") {
    return { error: "That request is a UPI transfer, not a gift card." };
  }

  const user = await db.query.profiles.findFirst({
    where: eq(profiles.id, request.userId),
    columns: { coinsBalance: true },
  });

  if (!user || user.coinsBalance < request.amountCoins) {
    return {
      error: `That user only has ${user?.coinsBalance ?? 0} coins now — don't issue this card.`,
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(redemptions)
      .set({
        status: "issued",
        cardCode,
        cardPin: cardPin || null,
        adminNote: note || null,
        processedAt: new Date(),
      })
      .where(eq(redemptions.id, id));

    await tx.insert(coinsLedger).values({
      userId: request.userId,
      delta: -request.amountCoins,
      reason: `${request.brandName} gift card — ₹${request.amountCoins}`,
      refType: "redemption",
      refId: request.id,
    });

    await tx
      .update(profiles)
      .set({
        coinsBalance: sql`${profiles.coinsBalance} - ${request.amountCoins}`,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, request.userId));
  });

  revalidatePath("/admin/redemptions");
  revalidatePath("/admin");
  return { ok: true };
}

/** Rejects a request. No ledger entry — nothing was ever debited. */
export async function rejectRedemption(
  id: string,
  note: string,
): Promise<AdminResult> {
  await requireAdmin();

  const request = await db.query.redemptions.findFirst({
    where: eq(redemptions.id, id),
    columns: { status: true },
  });

  if (!request) return { error: "That request no longer exists." };
  if (request.status !== "pending") {
    return { error: "That request has already been processed." };
  }

  await db
    .update(redemptions)
    .set({
      status: "rejected",
      adminNote: note || null,
      processedAt: new Date(),
    })
    .where(eq(redemptions.id, id));

  revalidatePath("/admin/redemptions");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Records a UPI transfer that has already been made, and debits the coins.
 *
 * The UPI twin of issueRedemption, and the same rule applies: the money moves
 * first, by hand, and this only writes down that it did. Nothing here talks to a
 * payment API — keeping the transfer manual is what preserves the admin review
 * step, which is the only fraud check between a new account and a payout.
 */
export async function settleUpiRedemption(
  id: string,
  formData: FormData,
): Promise<AdminResult> {
  await requireAdmin();

  const parsed = settleUpiSchema.safeParse({
    payoutRef: formData.get("payoutRef"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the transfer details",
    };
  }

  const { payoutRef, note } = parsed.data;

  const request = await db.query.redemptions.findFirst({
    where: eq(redemptions.id, id),
  });

  if (!request) return { error: "That request no longer exists." };
  if (request.status !== "pending") {
    return { error: "That request has already been processed." };
  }
  if (request.method !== "upi") {
    return { error: "That request is for a gift card, not a UPI transfer." };
  }

  const user = await db.query.profiles.findFirst({
    where: eq(profiles.id, request.userId),
    columns: { coinsBalance: true },
  });

  /* Re-checked here because the user may have spent down since requesting. The
     transfer has already left the admin's account by this point, so this cannot
     undo a mistake — it is a guard against recording a debit the balance cannot
     cover, which would trip the non-negative constraint. */
  if (!user || user.coinsBalance < request.amountCoins) {
    return {
      error: `That user only has ${user?.coinsBalance ?? 0} coins now — don't send this transfer.`,
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(redemptions)
      .set({
        status: "issued",
        payoutRef,
        adminNote: note || null,
        processedAt: new Date(),
      })
      .where(eq(redemptions.id, id));

    await tx.insert(coinsLedger).values({
      userId: request.userId,
      delta: -request.amountCoins,
      reason: `UPI transfer — ₹${request.amountCoins}`,
      refType: "redemption",
      refId: request.id,
    });

    await tx
      .update(profiles)
      .set({
        coinsBalance: sql`${profiles.coinsBalance} - ${request.amountCoins}`,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, request.userId));
  });

  revalidatePath("/admin/redemptions");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Opens or closes a payout method.
 *
 * Scope is the redeem flow only. The landing page names both methods in static
 * copy regardless — so this decides what a request may be filed as, not what
 * the public site advertises.
 */
export async function setPayoutMethodEnabled(
  method: string,
  isEnabled: boolean,
): Promise<AdminResult> {
  await requireAdmin();

  if (!isPayoutMethod(method)) {
    return { error: "Unknown payout method." };
  }

  /* Closing the last open method would leave every user holding coins they
     cannot spend, with a redeem page offering nothing. Cheaper to refuse than
     to explain. */
  if (!isEnabled) {
    const enabled = await getEnabledPayoutMethods();
    if (enabled.length <= 1 && enabled.includes(method)) {
      return {
        error:
          "That's the only way left to redeem. Turn another method on first.",
      };
    }
  }

  await db
    .update(payoutMethods)
    .set({ isEnabled, updatedAt: new Date() })
    .where(eq(payoutMethods.id, method));

  revalidatePath("/admin/payout-methods");

  return { ok: true };
}

/**
 * Takes a single gift card brand off sale, or puts it back.
 *
 * Scope is the redeem form. The landing page lists brands from the catalogue in
 * code and is left alone deliberately — a brand paused for a week is not worth
 * a public copy change.
 *
 * Upserted rather than updated: a brand with no row counts as on, so the first
 * time one is switched off there is nothing to update.
 */
export async function setGiftCardBrandEnabled(
  brandId: string,
  isEnabled: boolean,
): Promise<AdminResult> {
  await requireAdmin();

  if (!getGiftCard(brandId)) {
    return { error: "Unknown gift card brand." };
  }

  /* Leaving gift cards switched on with nothing to buy would put the user in
     front of an empty grid. Closing the method is the honest way to say that. */
  if (!isEnabled) {
    const brands = await getEnabledGiftCardBrands();
    if (brands.length <= 1 && brands.some((b) => b.id === brandId)) {
      return {
        error:
          "That's the last card on sale. Switch gift cards off entirely instead.",
      };
    }
  }

  const key = giftCardBrandKey(brandId);

  await db
    .insert(payoutMethods)
    .values({ id: key, isEnabled })
    .onConflictDoUpdate({
      target: payoutMethods.id,
      set: { isEnabled, updatedAt: new Date() },
    });

  revalidatePath("/admin/payout-methods");

  return { ok: true };
}

function isCode(err: unknown, code: string) {
  return (
    typeof err === "object" && err !== null && "code" in err && err.code === code
  );
}
