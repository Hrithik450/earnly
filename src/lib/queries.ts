import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  pointsLedger,
  submissions,
  tasks,
  withdrawals,
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
  return db.query.pointsLedger.findMany({
    where: eq(pointsLedger.userId, userId),
    orderBy: [desc(pointsLedger.createdAt)],
    limit,
  });
}

export async function getWithdrawals(userId: string) {
  return db.query.withdrawals.findMany({
    where: eq(withdrawals.userId, userId),
    orderBy: [desc(withdrawals.createdAt)],
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
 * Points locked in withdrawal requests that haven't been paid or rejected yet.
 *
 * The balance on the profile is not decremented until a request is approved, so
 * this is what stops a user requesting the same 500 points three times over.
 */
export async function getPendingWithdrawalPoints(userId: string) {
  const pending = await db.query.withdrawals.findMany({
    where: and(
      eq(withdrawals.userId, userId),
      inArray(withdrawals.status, ["pending"]),
    ),
    columns: { amountPoints: true },
  });

  return pending.reduce((sum, w) => sum + w.amountPoints, 0);
}
