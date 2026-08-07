"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { submissions, tasks } from "@/lib/drizzle/schema";
import type { TaskFormField } from "@/lib/drizzle/schema";

/** `coins` is what the submission is worth if approved, not what was credited. */
export type SubmitResult = { error: string } | { ok: true; coins: number };

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
 * Records a task submission for review.
 *
 * Nothing is credited here. Coins used to land the moment the form was posted,
 * which meant the only thing standing between an empty answer and a gift card
 * was the honesty of whoever filled it in. The row goes in as pending and an
 * admin approves it, which is where the ledger entry is written.
 *
 * The reward is still snapshotted from the task now rather than read at
 * approval, so editing a task's coins does not silently change what someone was
 * promised when they did the work.
 */
export async function submitTask(
  taskId: string,
  formData: FormData,
): Promise<SubmitResult> {
  /* Middleware does not run for server actions, so this is the only thing
     standing between an anonymous POST and a row in the review queue. */
  const profile = await requireUser();

  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });

  if (!task) return { error: "That task no longer exists." };
  if (!task.isActive) return { error: "That task has closed." };

  const collected = collectAnswers(task.formSchema, formData);
  if ("error" in collected) return collected;

  /* Rejected attempts are not counted — a blurry screenshot should cost a
     resubmission, not the task. There is no unique constraint backing this, so
     two simultaneous posts could both pass; the cost is one extra row in the
     queue for an admin to reject, which is not worth a lock for. */
  if (task.maxCompletions !== null) {
    const [{ used }] = await db
      .select({ used: sql<number>`count(*)::int` })
      .from(submissions)
      .where(
        and(
          eq(submissions.taskId, task.id),
          eq(submissions.userId, profile.id),
          inArray(submissions.status, ["pending", "approved"]),
        ),
      );

    if (used >= task.maxCompletions) {
      return {
        error:
          task.maxCompletions === 1
            ? "You've already submitted this task."
            : `You've used all ${task.maxCompletions} attempts at this task.`,
      };
    }
  }

  await db.insert(submissions).values({
    taskId: task.id,
    userId: profile.id,
    data: collected.data,
    coinsAwarded: task.coins,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inbox");
  revalidatePath(`/dashboard/tasks/${task.slug}`);

  return { ok: true, coins: task.coins };
}
