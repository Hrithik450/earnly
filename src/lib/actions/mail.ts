"use server";

import { and, eq, inArray } from "drizzle-orm";
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
 * Sends one message to the selected users.
 *
 * The recipient ids are re-resolved against the database rather than trusted:
 * the client posts ids, and the addresses they map to are read here. That also
 * re-applies the blocked filter, so an account blocked between the page loading
 * and the send being confirmed drops out on its own.
 */
export async function sendAdminMail(input: {
  subject: string;
  body: string;
  recipientIds: string[];
}): Promise<MailResult> {
  await requireAdmin();

  const parsed = adminMailSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the message" };
  }

  const { subject, body, recipientIds } = parsed.data;

  const recipients = await db
    .select({ email: profiles.email, name: profiles.fullName })
    .from(profiles)
    .where(
      and(
        inArray(profiles.id, recipientIds),
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
