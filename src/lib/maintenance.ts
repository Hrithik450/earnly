import { count, eq, gte } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  platformSettings,
  submissions,
  type PlatformSettings,
} from "@/lib/drizzle/schema";

/**
 * The maintenance gate.
 *
 * Two switches decide whether the platform is open, and they resolve to one
 * answer rather than two:
 *
 * - the manual toggle, which an admin sets and which stays set;
 * - the auto limit, which trips the manual toggle on once submissions since
 *   `countingSince` reach `autoSubmissionLimit`.
 *
 * The auto path writes `maintenanceMode = true` rather than being evaluated
 * separately at read time. That is what keeps the admin panel honest: after the
 * limit trips, the manual switch shows "on", because it genuinely is on. An
 * admin turning it back off is the only thing that reopens the platform, and
 * doing so resets `countingSince` so the limit starts counting again from zero.
 *
 * `isPlatformOpen` is the single function every guard calls. Nothing checks
 * `maintenanceMode` directly — routing every caller through here is what makes
 * the auto-trip impossible to skip.
 */

/** id of the singleton settings row. */
const SETTINGS_ID = 1;

/**
 * The settings row, creating it if this is a fresh database.
 *
 * Per-request memoised: a dashboard page runs the guard in the layout and again
 * in the page, and both should cost one query between them.
 */
export const getPlatformSettings = cache(
  async (): Promise<PlatformSettings> => {
    const existing = await db.query.platformSettings.findFirst({
      where: eq(platformSettings.id, SETTINGS_ID),
    });

    if (existing) return existing;

    /* The migration seeds this row, so reaching here means the migration has
       not run. Insert rather than throw: a missing settings row must not take
       the whole app down, and the defaults are "open for business". */
    const [created] = await db
      .insert(platformSettings)
      .values({ id: SETTINGS_ID })
      .onConflictDoNothing()
      .returning();

    if (created) return created;

    /* Lost the race with a concurrent request that inserted first. */
    const row = await db.query.platformSettings.findFirst({
      where: eq(platformSettings.id, SETTINGS_ID),
    });

    if (!row) throw new Error("platform_settings row is missing.");
    return row;
  },
);

/** Submissions recorded since the counter last reset. */
export async function countSubmissionsSinceReset(
  since: Date,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(submissions)
    .where(gte(submissions.createdAt, since));

  return row?.total ?? 0;
}

export type PlatformStatus = {
  isOpen: boolean;
  message: string | null;
  autoLimitEnabled: boolean;
  autoSubmissionLimit: number;
  countingSince: Date;
};

/**
 * Whether the platform is accepting activity right now.
 *
 * Checked on every guarded page load and every write action. When the auto
 * limit has been reached this also flips the manual switch, so the transition
 * into maintenance happens on the first request after the threshold rather than
 * waiting for a cron or an admin to notice.
 */
export async function getPlatformStatus(): Promise<PlatformStatus> {
  const settings = await getPlatformSettings();

  const base = {
    message: settings.maintenanceMessage,
    autoLimitEnabled: settings.autoLimitEnabled,
    autoSubmissionLimit: settings.autoSubmissionLimit,
    countingSince: settings.countingSince,
  };

  if (settings.maintenanceMode) return { ...base, isOpen: false };

  if (!settings.autoLimitEnabled) return { ...base, isOpen: true };

  const total = await countSubmissionsSinceReset(settings.countingSince);
  if (total < settings.autoSubmissionLimit) return { ...base, isOpen: true };

  /* Guarded on maintenanceMode = false so two concurrent requests crossing the
     threshold together do not both write — the second one updates nothing. */
  await db
    .update(platformSettings)
    .set({ maintenanceMode: true, updatedAt: new Date() })
    .where(eq(platformSettings.maintenanceMode, false));

  return { ...base, isOpen: false };
}

/** Shorthand for the guards, which only care about the boolean. */
export async function isPlatformOpen(): Promise<boolean> {
  const { isOpen } = await getPlatformStatus();
  return isOpen;
}
