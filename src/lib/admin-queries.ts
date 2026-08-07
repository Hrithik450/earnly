import { and, count, desc, eq, sql, sum, type SQL } from "drizzle-orm";
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

export type UserFilters = {
  query?: string;
  status?: "all" | "active" | "blocked" | "admin";
  industry?: string;
  country?: string;
  page?: number;
};

/** Rows per page in the admin users table. */
export const USERS_PAGE_SIZE = 50;

/**
 * Builds the WHERE clause shared by the page query and its count.
 *
 * Kept in one place because the two must agree exactly — a count that applies
 * different filters than the rows it is counting produces a pager that lies.
 */
function userFilterConditions(filters: UserFilters) {
  const conditions: SQL[] = [];

  const q = filters.query?.trim();
  if (q) {
    /* ILIKE with both wildcards, so this is a substring match and no index can
       serve it. That is a deliberate trade: the alternative is a tsvector
       column and a trigger to maintain it, which is a lot of machinery for a
       search that runs when an admin types. Postgres scans the table; at this
       size that is faster than the round trip that carries the result. */
    const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const match = sql`${like}`;

    conditions.push(
      sql`(
        ${profiles.fullName} ILIKE ${match}
        OR ${profiles.email} ILIKE ${match}
        OR ${profiles.phone} ILIKE ${match}
        OR ${profiles.industry} ILIKE ${match}
        OR ${profiles.country} ILIKE ${match}
        OR ${profiles.state} ILIKE ${match}
        OR ${profiles.hobbies} ILIKE ${match}
      )`,
    );
  }

  switch (filters.status) {
    case "active":
      conditions.push(
        sql`${profiles.isBlocked} = false AND ${profiles.isAdmin} = false`,
      );
      break;
    case "blocked":
      conditions.push(sql`${profiles.isBlocked} = true`);
      break;
    case "admin":
      conditions.push(sql`${profiles.isAdmin} = true`);
      break;
  }

  if (filters.industry) {
    conditions.push(eq(profiles.industry, filters.industry));
  }
  if (filters.country) {
    conditions.push(eq(profiles.country, filters.country));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * `profiles.id`, written out rather than interpolated.
 *
 * Inside a select projection Drizzle renders a column unqualified, so
 * `${profiles.id}` becomes bare `"id"`. In a correlated subquery that has its
 * own FROM, the inner table wins the name — `au.id = "id"` resolves to
 * `au.id = au.id`, which is true for every row. Qualifying it is what makes the
 * correlation point back out at the row being returned.
 */
const OUTER_USER_ID = sql`"profiles"."id"`;

/**
 * One page of users, filtered in the database.
 *
 * Filtering used to happen in the browser over every row the page had sent.
 * That is fine until the user base is large enough that shipping it is the
 * expensive part, at which point the honest fix is to make the database do the
 * work — which is what this is.
 *
 * The submission count is a correlated subquery rather than a join with a GROUP
 * BY: grouping would have to happen before LIMIT, so the database would build
 * an aggregate over every matching user just to return fifty of them.
 *
 * last_sign_in_at comes from auth.users, which Drizzle does not model — Supabase
 * owns that schema, and mirroring the column into profiles would mean keeping a
 * copy in step with every login.
 */
export async function getUsersPage(filters: UserFilters = {}) {
  const where = userFilterConditions(filters);
  const page = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * USERS_PAGE_SIZE;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        profile: profiles,
        submissionCount: sql<number>`(
          SELECT count(*)::int FROM ${submissions}
          WHERE ${submissions.userId} = ${OUTER_USER_ID}
        )`,
        lastSignInAt: sql<Date | null>`(
          SELECT au.last_sign_in_at FROM auth.users au WHERE au.id = ${OUTER_USER_ID}
        )`,
      })
      .from(profiles)
      .where(where)
      .orderBy(desc(profiles.createdAt))
      .limit(USERS_PAGE_SIZE)
      .offset(offset),

    db
      .select({ total: sql<number>`count(*)::int` })
      .from(profiles)
      .where(where),
  ]);

  return { rows, total, page, pageSize: USERS_PAGE_SIZE };
}

/**
 * The distinct industries and countries users have actually chosen.
 *
 * Drives the two filter dropdowns. Built from the table rather than from the
 * full 147- and 250-entry reference lists so the options are only ever ones
 * that can return a result — offering an industry nobody picked is a filter
 * guaranteed to show nothing.
 */
export async function getUserFacets() {
  const [industries, countries] = await Promise.all([
    db
      .selectDistinct({ value: profiles.industry })
      .from(profiles)
      .where(sql`${profiles.industry} IS NOT NULL`)
      .orderBy(profiles.industry),
    db
      .selectDistinct({ value: profiles.country })
      .from(profiles)
      .where(sql`${profiles.country} IS NOT NULL`)
      .orderBy(profiles.country),
  ]);

  return {
    industries: industries.map((r) => r.value).filter(Boolean) as string[],
    countries: countries.map((r) => r.value).filter(Boolean) as string[],
  };
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

/** Recipients returned per search in the mail composer. */
export const MAIL_SEARCH_LIMIT = 50;

/**
 * Search the address book for the compose page.
 *
 * Blocked accounts are excluded, which is what makes the picker itself a safety
 * rail: an admin cannot select someone they should not be emailing because that
 * person is not in the list to select. The send action filters again on the
 * same rule, since a stale page could still post an id blocked since it loaded.
 *
 * Capped rather than paged. The picker is for finding specific people, and
 * nobody scrolls to recipient 300 — if the result is truncated the answer is to
 * type more, which the UI says. Sending to everyone is a separate control that
 * does not go through this at all.
 */
export async function searchMailableUsers(query: string) {
  const q = query.trim();

  const conditions = [eq(profiles.isBlocked, false)];

  if (q) {
    const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conditions.push(
      sql`(${profiles.fullName} ILIKE ${like} OR ${profiles.email} ILIKE ${like})`,
    );
  }

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
      })
      .from(profiles)
      .where(and(...conditions))
      .orderBy(desc(profiles.createdAt))
      .limit(MAIL_SEARCH_LIMIT),

    db
      .select({ total: sql<number>`count(*)::int` })
      .from(profiles)
      .where(and(...conditions)),
  ]);

  return { rows, total, truncated: total > rows.length };
}

/** How many accounts a send-to-everyone would reach. */
export async function countMailableUsers() {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(profiles)
    .where(eq(profiles.isBlocked, false));

  return total;
}
