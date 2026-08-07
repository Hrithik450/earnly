import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  coinsLedger,
  redemptions,
  submissions,
  tasks,
} from "@/lib/drizzle/schema";

/**
 * Read-side queries for the user app.
 *
 * Kept out of the "use server" action modules on purpose: every export there
 * becomes a callable endpoint, and a read helper taking a userId argument would
 * let anyone pass someone else's id. Callers here always pass the id from
 * requireUser().
 */

/** Active tasks, with the ids of the ones this user has already finished. */
export async function getTaskBoard(userId: string) {
  const [available, done] = await Promise.all([
    db.query.tasks.findMany({
      where: eq(tasks.isActive, true),
      orderBy: [desc(tasks.createdAt)],
    }),
    db.query.submissions.findMany({
      where: eq(submissions.userId, userId),
      columns: { taskId: true },
    }),
  ]);

  return { available, completedIds: new Set(done.map((d) => d.taskId)) };
}

export async function getTaskBySlug(slug: string) {
  return db.query.tasks.findFirst({ where: eq(tasks.slug, slug) });
}

export async function hasCompleted(taskId: string, userId: string) {
  const existing = await db.query.submissions.findFirst({
    where: and(eq(submissions.taskId, taskId), eq(submissions.userId, userId)),
    columns: { id: true },
  });
  return Boolean(existing);
}

export async function getLedger(userId: string, limit = 50) {
  return db.query.coinsLedger.findMany({
    where: eq(coinsLedger.userId, userId),
    orderBy: [desc(coinsLedger.createdAt)],
    limit,
  });
}

export async function getRedemptions(userId: string) {
  return db.query.redemptions.findMany({
    where: eq(redemptions.userId, userId),
    orderBy: [desc(redemptions.createdAt)],
  });
}

/** A user's own submissions, newest first, with the task each belongs to. */
export async function getMySubmissions(userId: string, limit = 20) {
  return db.query.submissions.findMany({
    where: eq(submissions.userId, userId),
    orderBy: [desc(submissions.createdAt)],
    limit,
    with: { task: { columns: { title: true, slug: true } } },
  });
}

/**
 * Coins locked in redemption requests that haven't been issued or rejected yet.
 *
 * The balance on the profile is not decremented until a card is issued, so this
 * is what stops a user redeeming the same 500 coins three times over.
 */
export async function getPendingRedemptionCoins(userId: string) {
  const pending = await db.query.redemptions.findMany({
    where: and(
      eq(redemptions.userId, userId),
      inArray(redemptions.status, ["pending"]),
    ),
    columns: { amountCoins: true },
  });

  return pending.reduce((sum, r) => sum + r.amountCoins, 0);
}
