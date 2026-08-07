import { count, desc, eq, sql, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, redemptions, submissions, tasks } from "@/lib/drizzle/schema";

/**
 * Read-side queries for the admin panel.
 *
 * These read across all users by design, so nothing here is safe to call
 * without requireAdmin() first. Kept as plain functions rather than server
 * actions so they are not reachable as endpoints.
 */

export async function getAdminStats() {
  const [[users], [taskCount], [subCount], [pending], [issued]] =
    await Promise.all([
      db.select({ n: count() }).from(profiles),
      db.select({ n: count() }).from(tasks).where(eq(tasks.isActive, true)),
      db.select({ n: count() }).from(submissions),
      db
        .select({ n: count(), coins: sum(redemptions.amountCoins) })
        .from(redemptions)
        .where(eq(redemptions.status, "pending")),
      db
        .select({ coins: sum(redemptions.amountCoins) })
        .from(redemptions)
        .where(eq(redemptions.status, "issued")),
    ]);

  return {
    users: users.n,
    activeTasks: taskCount.n,
    submissions: subCount.n,
    pendingRedemptions: pending.n,
    /* sum() returns a string (or null on an empty set) — Postgres numerics do
       not fit a JS number in general, so the driver keeps them textual. */
    pendingCoins: Number(pending.coins ?? 0),
    issuedCoins: Number(issued.coins ?? 0),
  };
}

export async function getAllTasks() {
  return db.query.tasks.findMany({ orderBy: [desc(tasks.createdAt)] });
}

export async function getTaskById(id: string) {
  return db.query.tasks.findFirst({ where: eq(tasks.id, id) });
}

/** Submission counts per task, for the tasks table. */
export async function getSubmissionCounts() {
  const rows = await db
    .select({ taskId: submissions.taskId, n: count() })
    .from(submissions)
    .groupBy(submissions.taskId);

  return new Map(rows.map((r) => [r.taskId, r.n]));
}

export async function getAllSubmissions(limit = 200) {
  return db.query.submissions.findMany({
    orderBy: [desc(submissions.createdAt)],
    limit,
    with: {
      task: { columns: { title: true, slug: true } },
      user: { columns: { fullName: true, email: true, phone: true } },
    },
  });
}

export async function getAllUsers() {
  /* Submission count per user in one query rather than N — the users table
     shows it on every row. */
  const rows = await db
    .select({
      profile: profiles,
      submissionCount: sql<number>`count(${submissions.id})::int`,
    })
    .from(profiles)
    .leftJoin(submissions, eq(submissions.userId, profiles.id))
    .groupBy(profiles.id)
    .orderBy(desc(profiles.createdAt));

  return rows;
}

export async function getAllRedemptions() {
  return db.query.redemptions.findMany({
    orderBy: [desc(redemptions.createdAt)],
    with: {
      user: {
        columns: {
          fullName: true,
          email: true,
          phone: true,
          coinsBalance: true,
        },
      },
    },
  });
}
