"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { pointsLedger, profiles, submissions, tasks } from "@/lib/drizzle/schema";
import type { TaskFormField } from "@/lib/drizzle/schema";

export type SubmitResult = { error: string } | { ok: true; points: number };

/** Postgres unique-violation. */
const UNIQUE_VIOLATION = "23505";

/**
 * Validates a submission against the task's own form schema.
 *
 * The schema lives in the database, so it cannot be a static zod object — it is
 * checked field by field here. Only keys declared on the task are kept, which
 * means extra fields posted by a client are dropped rather than stored.
 */
function collectAnswers(
  schema: TaskFormField[],
  formData: FormData,
): { error: string } | { data: Record<string, string> } {
  const data: Record<string, string> = {};

  for (const field of schema) {
    const raw = formData.get(field.id);
    const value = typeof raw === "string" ? raw.trim() : "";

    if (!value) {
      if (field.required) return { error: `${field.label} is required` };
      continue;
    }

    if (value.length > 4000) {
      return { error: `${field.label} is too long` };
    }

    if (field.type === "number" && !/^-?\d+(\.\d+)?$/.test(value)) {
      return { error: `${field.label} must be a number` };
    }

    if (field.type === "url" || field.type === "image") {
      /* Only http(s). A javascript: or data: URL here would be rendered back as
         a link in the admin panel. */
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        return { error: `${field.label} must be a valid link` };
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { error: `${field.label} must be an http or https link` };
      }
    }

    if (field.type === "select" && !(field.options ?? []).includes(value)) {
      return { error: `Choose one of the listed options for ${field.label}` };
    }

    data[field.id] = value;
  }

  return { data };
}

/**
 * Records a task submission and credits the points in one transaction.
 *
 * Points are read from the task row, never from the form — the reward is not
 * something the client gets to state. All three writes (submission, ledger
 * entry, balance bump) share a transaction, so a crash can never leave a
 * balance that disagrees with the ledger.
 */
export async function submitTask(
  taskId: string,
  formData: FormData,
): Promise<SubmitResult> {
  /* Middleware does not run for server actions, so this is the only thing
     standing between an anonymous POST and a credited balance. */
  const profile = await requireUser();

  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });

  if (!task) return { error: "That task no longer exists." };
  if (!task.isActive) return { error: "That task has closed." };

  const collected = collectAnswers(task.formSchema, formData);
  if ("error" in collected) return collected;

  const points = task.points;

  try {
    await db.transaction(async (tx) => {
      const [submission] = await tx
        .insert(submissions)
        .values({
          taskId: task.id,
          userId: profile.id,
          data: collected.data,
          pointsAwarded: points,
        })
        .returning({ id: submissions.id });

      await tx.insert(pointsLedger).values({
        userId: profile.id,
        delta: points,
        reason: `Completed: ${task.title}`,
        refType: "submission",
        refId: submission.id,
      });

      /* Incremented in SQL rather than read-then-written, so two concurrent
         credits cannot both read the same starting balance. */
      await tx
        .update(profiles)
        .set({
          pointsBalance: sql`${profiles.pointsBalance} + ${points}`,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, profile.id));
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === UNIQUE_VIOLATION
    ) {
      return { error: "You've already completed this task." };
    }
    throw err;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/earnings");
  revalidatePath(`/dashboard/tasks/${task.slug}`);

  return { ok: true, points };
}
