"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import {
  coinsLedger,
  profiles,
  redemptions,
  tasks,
} from "@/lib/drizzle/schema";
import { issueCardSchema, taskSchema } from "@/lib/validations";

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

  const { description, instructions, category, coverImageUrl, ...rest } =
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

  const { description, instructions, category, coverImageUrl, ...rest } =
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
 * Closes a task instead of deleting it.
 *
 * Deleting would cascade to its submissions, which are the evidence for points
 * already paid out. Nothing in the admin panel hard-deletes a task.
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

function isCode(err: unknown, code: string) {
  return (
    typeof err === "object" && err !== null && "code" in err && err.code === code
  );
}
