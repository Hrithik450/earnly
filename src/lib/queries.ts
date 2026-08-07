import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  coinsLedger,
  payoutMethods,
  redemptions,
  submissions,
  tasks,
} from "@/lib/drizzle/schema";
import { GIFT_CARDS, type GiftCardBrand } from "@/lib/gift-cards";
import {
  giftCardBrandKey,
  PAYOUT_METHODS,
  type PayoutMethod,
} from "@/lib/payout-methods";

/**
 * Read-side queries for the user app.
 *
 * Kept out of the "use server" action modules on purpose: every export there
 * becomes a callable endpoint, and a read helper taking a userId argument would
 * let anyone pass someone else's id. Callers here always pass the id from
 * requireUser().
 */

/**
 * Active tasks, plus how many attempts this user has spent on each.
 *
 * "Spent" counts pending and approved rows: a submission awaiting review has
 * used up an attempt, or someone could post the same task ten times before an
 * admin looks at any of them. Rejected rows are not counted, so a rejection
 * hands the attempt back.
 */
export async function getTaskBoard(userId: string) {
  const [available, mine] = await Promise.all([
    db.query.tasks.findMany({
      where: eq(tasks.isActive, true),
      orderBy: [desc(tasks.createdAt)],
    }),
    db
      .select({
        taskId: submissions.taskId,
        used: sql<number>`count(*) FILTER (WHERE ${submissions.status} <> 'rejected')::int`,
        pending: sql<number>`count(*) FILTER (WHERE ${submissions.status} = 'pending')::int`,
        approved: sql<number>`count(*) FILTER (WHERE ${submissions.status} = 'approved')::int`,
      })
      .from(submissions)
      .where(eq(submissions.userId, userId))
      .groupBy(submissions.taskId),
  ]);

  return {
    available,
    attempts: new Map(mine.map((row) => [row.taskId, row])),
  };
}

export type TaskAttempts = Awaited<
  ReturnType<typeof getTaskBoard>
>["attempts"] extends Map<string, infer V>
  ? V
  : never;

/** Whether this user may still submit, and why not if they can't. */
export function remainingAttempts(
  maxCompletions: number | null,
  used: number,
): number | null {
  if (maxCompletions === null) return null;
  return Math.max(0, maxCompletions - used);
}

export async function getTaskBySlug(slug: string) {
  return db.query.tasks.findFirst({ where: eq(tasks.slug, slug) });
}

/**
 * How many attempts this user has spent on one task, and whether any is still
 * awaiting review. Rejected rows are excluded — see getTaskBoard.
 */
export async function getTaskAttempts(taskId: string, userId: string) {
  const [row] = await db
    .select({
      used: sql<number>`count(*) FILTER (WHERE ${submissions.status} <> 'rejected')::int`,
      pending: sql<number>`count(*) FILTER (WHERE ${submissions.status} = 'pending')::int`,
      approved: sql<number>`count(*) FILTER (WHERE ${submissions.status} = 'approved')::int`,
      rejected: sql<number>`count(*) FILTER (WHERE ${submissions.status} = 'rejected')::int`,
    })
    .from(submissions)
    .where(and(eq(submissions.taskId, taskId), eq(submissions.userId, userId)));

  return row ?? { used: 0, pending: 0, approved: 0, rejected: 0 };
}

/**
 * A user's own submissions with the task and the admin's decision.
 *
 * Ordered by when it was decided, falling back to when it was sent, so a
 * just-reviewed item surfaces above older ones rather than sitting wherever it
 * was originally filed.
 */
export async function getSubmissionHistory(userId: string, limit = 100) {
  return db.query.submissions.findMany({
    where: eq(submissions.userId, userId),
    orderBy: [desc(sql`coalesce(${submissions.reviewedAt}, ${submissions.createdAt})`)],
    limit,
    with: { task: { columns: { title: true, slug: true } } },
  });
}

/**
 * One submission with its whole task, for the edit page.
 *
 * Scoped to the owner in the query rather than checked after loading, so a
 * guessed id returns nothing instead of returning someone else's answers to be
 * filtered out a line later.
 */
export async function getOwnSubmission(id: string, userId: string) {
  return db.query.submissions.findFirst({
    where: and(eq(submissions.id, id), eq(submissions.userId, userId)),
    with: { task: true },
  });
}

/** Submissions still needing the user's attention — waiting, or turned down. */
export async function getOpenSubmissionCount(userId: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(submissions)
    .where(
      and(
        eq(submissions.userId, userId),
        inArray(submissions.status, ["pending", "rejected"]),
      ),
    );
  return n;
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

/**
 * The payout methods currently open, in the order declared in
 * payout-methods.ts.
 *
 * Every page that names a reward calls this — the landing copy, the redeem form
 * and the server action all branch on it, which is what makes the admin toggle
 * take effect everywhere at once instead of only where someone remembered to
 * check.
 *
 * A method missing from the table counts as off. That way a database that
 * predates a newly added method shows it disabled rather than crashing, and the
 * admin has to switch it on deliberately.
 */
export async function getEnabledPayoutMethods(): Promise<PayoutMethod[]> {
  const rows = await db
    .select({ id: payoutMethods.id, isEnabled: payoutMethods.isEnabled })
    .from(payoutMethods);

  const enabled = new Set(
    rows.filter((r) => r.isEnabled).map((r) => r.id as string),
  );

  return PAYOUT_METHODS.filter((m) => enabled.has(m));
}

export async function isPayoutMethodEnabled(
  method: PayoutMethod,
): Promise<boolean> {
  const enabled = await getEnabledPayoutMethods();
  return enabled.includes(method);
}

/**
 * The gift card brands a user may currently pick.
 *
 * A brand with no row counts as ON, which is the opposite of how methods are
 * treated. The catalogue is the source of truth for what exists, so a brand
 * added in a deploy should be on sale immediately rather than invisible until
 * someone notices a missing row — whereas a *method* is deliberate enough to be
 * worth switching on by hand.
 */
export async function getEnabledGiftCardBrands(): Promise<GiftCardBrand[]> {
  const rows = await db
    .select({ id: payoutMethods.id, isEnabled: payoutMethods.isEnabled })
    .from(payoutMethods);

  const disabled = new Set(
    rows.filter((r) => !r.isEnabled).map((r) => r.id as string),
  );

  return GIFT_CARDS.filter((card) => !disabled.has(giftCardBrandKey(card.id)));
}

export async function isGiftCardBrandEnabled(
  brandId: string,
): Promise<boolean> {
  const brands = await getEnabledGiftCardBrands();
  return brands.some((b) => b.id === brandId);
}
