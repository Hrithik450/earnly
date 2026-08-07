"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { platformSettings, profiles } from "@/lib/drizzle/schema";
import { emailLayout, sendBulkEmail } from "@/lib/email";
import { getPlatformSettings } from "@/lib/maintenance";
import { SITE } from "@/lib/site";

/**
 * The maintenance controls.
 *
 * Both switches write to the same `maintenanceMode` column. The auto limit does
 * not gate the platform on its own — it trips the manual switch, and once
 * tripped the manual switch is what has to be turned off to reopen. That is why
 * there is no third "is it auto or manual" state to reconcile anywhere: the
 * question "are we in maintenance" has exactly one answer stored in exactly one
 * place.
 */

export type MaintenanceResult =
  | { error: string }
  | { ok: true; notified?: number };

/** id of the singleton settings row. */
const SETTINGS_ID = 1;

/* Belt and braces on an admin-only field, but a settings row is not the place
   to discover that someone posted a nine-digit number. */
const MAX_LIMIT = 1_000_000;

/** Every page a maintenance change could affect. */
function revalidateAll() {
  revalidatePath("/", "layout");
}

/**
 * Emails everyone that the platform is down.
 *
 * Only sent when maintenance is switched on, and only to non-blocked users —
 * telling a suspended account we are sorry for the inconvenience is not a
 * message anyone means to send.
 */
async function notifyMaintenance(message: string | null) {
  const users = await db
    .select({ email: profiles.email, name: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.isBlocked, false));

  if (users.length === 0) return 0;

  const html = emailLayout(
    "We're down for maintenance",
    [
      "We're carrying out maintenance on the platform, so tasks and redemptions are paused for now.",
      message ?? "we're working to have it back as quickly as we can.",
      '<strong style="color:inherit">Your coins are safe.</strong> Nothing expires while we\'re down, and your balance will be exactly as you left it.',
      "If you already requested a withdrawal, it stays in the queue and will be processed as normal — you don't need to request it again.",
      "Sorry for the inconvenience. We'll be back shortly.",
    ],
    {
      preheader: "Your coins are safe — we'll be back shortly.",
      footnote:
        "You're receiving this because you have an account with us. No action is needed.",
    },
  );

  const { sent } = await sendBulkEmail({
    recipients: users,
    subject: `${SITE.name} is temporarily down for maintenance`,
    html,
  });

  return sent;
}

/**
 * The manual switch.
 *
 * Switching off resets `countingSince` to now. Without that, a platform put
 * into maintenance by the auto limit would trip straight back in on the next
 * submission, because the count that crossed the threshold is still there.
 */
export async function setMaintenanceMode(
  isOn: boolean,
  message?: string,
): Promise<MaintenanceResult> {
  await requireAdmin();

  const note = message?.trim() ? message.trim().slice(0, 500) : null;

  await db
    .update(platformSettings)
    .set({
      maintenanceMode: isOn,
      maintenanceMessage: isOn ? note : null,
      ...(isOn ? {} : { countingSince: new Date() }),
      updatedAt: new Date(),
    })
    .where(eq(platformSettings.id, SETTINGS_ID));

  revalidateAll();

  /* After the write, not before: if the mail provider is down the platform
     should still go into maintenance. */
  const notified = isOn ? await notifyMaintenance(note) : 0;

  return { ok: true, notified };
}

/** The auto limit's own switch, and its threshold. */
export async function setAutoLimit(
  isOn: boolean,
  limit: number,
): Promise<MaintenanceResult> {
  await requireAdmin();

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return {
      error: `The limit must be a whole number between 1 and ${MAX_LIMIT.toLocaleString("en-IN")}.`,
    };
  }

  await db
    .update(platformSettings)
    .set({
      autoLimitEnabled: isOn,
      autoSubmissionLimit: limit,
      updatedAt: new Date(),
    })
    .where(eq(platformSettings.id, SETTINGS_ID));

  revalidateAll();
  return { ok: true };
}

/**
 * Starts the submission count again from now, without touching either switch.
 *
 * Useful when raising the limit mid-cycle: the admin wants the new headroom to
 * apply from this moment rather than being eaten by submissions already
 * counted.
 */
export async function resetSubmissionCount(): Promise<MaintenanceResult> {
  await requireAdmin();

  const settings = await getPlatformSettings();

  /* Resetting while in maintenance would zero the count and leave the switch
     on, which looks like the reset failed. Turning maintenance off is the
     action that reopens, and it resets the count itself. */
  if (settings.maintenanceMode) {
    return {
      error:
        "Turn maintenance off to reopen — that resets the count on its own.",
    };
  }

  await db
    .update(platformSettings)
    .set({ countingSince: new Date(), updatedAt: new Date() })
    .where(eq(platformSettings.id, SETTINGS_ID));

  revalidateAll();
  return { ok: true };
}
