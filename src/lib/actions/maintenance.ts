"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { platformSettings, profiles } from "@/lib/drizzle/schema";
import { emailLayout, sendBulkEmail } from "@/lib/email";
import { getPlatformSettings } from "@/lib/maintenance";
import { SITE, siteUrl } from "@/lib/site";

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
  | { ok: true; notified?: number; emailError?: string };

/** id of the singleton settings row. */
const SETTINGS_ID = 1;

/* Belt and braces on an admin-only field, but a settings row is not the place
   to discover that someone posted a nine-digit number. */
const MAX_LIMIT = 1_000_000;

/** Every page a maintenance change could affect. */
function revalidateAll() {
  revalidatePath("/", "layout");
}

/** Everyone who should hear about an outage. */
async function mailingList() {
  /* Blocked accounts excluded — telling a suspended user we're sorry for the
     inconvenience, or that we're back and they can carry on earning, are both
     messages nobody means to send. */
  return db
    .select({ email: profiles.email, name: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.isBlocked, false));
}

/** Emails everyone that the platform is down. */
async function notifyDown(message: string | null) {
  const users = await mailingList();
  if (users.length === 0) return { sent: 0 };

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

  const { sent, reason } = await sendBulkEmail({
    recipients: users,
    subject: `${SITE.name} is temporarily down for maintenance`,
    html,
  });

  return { sent, reason };
}

/**
 * Emails everyone that the platform is back.
 *
 * The counterpart to notifyDown, and only sent when there was a down mail to be
 * the counterpart to — see the guard in setMaintenanceMode.
 */
async function notifyBack() {
  const users = await mailingList();
  if (users.length === 0) return { sent: 0 };

  const html = emailLayout(
    "We're back",
    [
      "Maintenance is finished and the platform is live again. Tasks and redemptions are open as normal.",
      "Your coins are exactly where you left them, and any withdrawal you requested while we were down is back in the queue.",
      `<a href="${siteUrl()}/dashboard" style="color:#e8442c;text-decoration:none;font-weight:600">Open your dashboard →</a>`,
      "Thanks for your patience.",
    ],
    {
      preheader: "Maintenance is finished — tasks and redemptions are open.",
      footnote:
        "You're receiving this because we emailed you when the platform went down.",
    },
  );

  const { sent, reason } = await sendBulkEmail({
    recipients: users,
    subject: `${SITE.name} is back online`,
    html,
  });

  return { sent, reason };
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

  /* Read before the write: the "we're back" mail must only go out if we were
     genuinely down. Switching an already-off switch off — a double click, a
     stale page — would otherwise mail every user to announce the end of an
     outage that never happened. */
  const before = await getPlatformSettings();
  const changed = before.maintenanceMode !== isOn;

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

  if (!changed) return { ok: true, notified: 0 };

  /* After the write, not before: if the mail provider is down the platform
     should still change state. */
  const { sent, reason } = isOn ? await notifyDown(note) : await notifyBack();

  return { ok: true, notified: sent, emailError: reason };
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
