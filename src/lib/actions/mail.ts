"use server";

import { and, eq, inArray } from "drizzle-orm";
import { searchMailableUsers } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { profiles } from "@/lib/drizzle/schema";
import { emailLayout, sendBulkEmail } from "@/lib/email";
import { adminMailSchema } from "@/lib/validations";

/**
 * Ad-hoc email from the admin panel.
 *
 * Separate from the maintenance notices, which are automatic and have fixed
 * copy. This is the manual channel: an admin writes the words and picks who
 * gets them.
 */

export type MailResult =
  | { error: string }
  | { ok: true; sent: number; failed: number; emailError?: string };

/**
 * Backs the recipient search box.
 *
 * A server action rather than a route handler so it is covered by the same
 * requireAdmin as everything else here — this returns names and addresses, and
 * an unauthenticated endpoint that does that is a mailing list anyone can
 * download.
 */
export async function searchRecipients(query: string) {
  await requireAdmin();
  return searchMailableUsers(query);
}

/** Escapes admin copy before it goes into the email template. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Plain text to paragraphs.
 *
 * A blank line starts a new paragraph; single newlines inside one become <br>.
 * That is what someone typing into a textarea expects, and it means the layout
 * helper still receives one string per paragraph.
 */
function toParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((block) => escapeHtml(block.trim()).replace(/\n/g, "<br />"))
    .filter(Boolean);
}

/**
 * Sends one message to the chosen audience.
 *
 * Addresses are never taken from the client. For a selected send the ids are
 * re-resolved against the database; for "everyone" the client sends no list at
 * all and the audience is defined here. Either way the blocked filter is
 * applied at send time, so an account blocked between the page loading and the
 * send being confirmed drops out on its own — and an account created in that
 * window is included in "everyone", which is what the word means.
 */
export async function sendAdminMail(input: {
  subject: string;
  body: string;
  audience:
    | { kind: "everyone" }
    | { kind: "selected"; ids: string[] };
}): Promise<MailResult> {
  await requireAdmin();

  const parsed = adminMailSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the message" };
  }

  const { subject, body, audience } = parsed.data;

  const recipients = await db
    .select({ email: profiles.email, name: profiles.fullName })
    .from(profiles)
    .where(
      audience.kind === "everyone"
        ? eq(profiles.isBlocked, false)
        : and(
            inArray(profiles.id, audience.ids),
            eq(profiles.isBlocked, false),
          ),
    );

  if (recipients.length === 0) {
    return { error: "None of those accounts can be emailed any more." };
  }

  const paragraphs = toParagraphs(body);
  if (paragraphs.length === 0) return { error: "Write a message" };

  const html = emailLayout(subject, paragraphs, {
    /* The subject would otherwise be repeated as the preheader, wasting the one
       line of inbox preview on words already on screen. */
    preheader: paragraphs[0].replace(/<[^>]+>/g, " ").slice(0, 120),
    footnote: "You're receiving this because you have an account with us.",
  });

  const { sent, failed, reason } = await sendBulkEmail({
    recipients,
    subject,
    html,
  });

  return { ok: true, sent, failed, emailError: reason };
}
