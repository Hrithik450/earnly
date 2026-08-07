import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { getInbox } from "@/lib/queries";
import { relativeTime, shortRef } from "@/lib/utils";

export const metadata: Metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

/**
 * What happened to everything the user submitted.
 *
 * This used to be an "Already done" list on the dashboard, which could only say
 * a task was finished. Now that an admin approves or rejects each submission
 * there is a decision to deliver — and a rejection has a reason attached that
 * the user needs to read before trying again. That is a message, not a list
 * item, so it gets its own page.
 */

const STATES = {
  pending: {
    label: "In review",
    colour: "var(--yellow)",
    ink: "var(--ink)",
    line: "We're checking this one. You'll see the coins here once it's approved.",
  },
  approved: {
    label: "Approved",
    colour: "var(--green)",
    ink: "#fff",
    line: null,
  },
  rejected: {
    label: "Not approved",
    colour: "var(--red)",
    ink: "#fff",
    line: "No coins for this one — fix what's mentioned above and send it again. It stays the same submission, so it doesn't use up another go.",
  },
} as const;

export default async function InboxPage() {
  const profile = await requireUser();
  const items = await getInbox(profile.id);

  const now = new Date();
  const waiting = items.filter((i) => i.status === "pending").length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl">Inbox</h1>
        <p className="caption mt-1.5 text-sm">
          {items.length === 0
            ? "Nothing here yet — submit a task and its result shows up here."
            : waiting > 0
              ? `${waiting} submission${waiting === 1 ? "" : "s"} still being reviewed.`
              : "Everything you've sent has been reviewed."}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="ink-card p-6">
          <p className="caption text-sm">
            Head back to the board and pick something up.
          </p>
          <Link
            href="/dashboard"
            className="btn-ink mt-4 inline-block bg-white px-5 py-2.5 text-sm"
          >
            See open tasks
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const state = STATES[item.status];
            const at = item.reviewedAt ?? item.createdAt;

            return (
              <li key={item.id} className="ink-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      className="sticker"
                      style={{ background: state.colour, color: state.ink }}
                    >
                      {state.label}
                    </span>
                    <h2 className="mt-2.5 text-xl">
                      <span className="mono mr-2 align-middle text-[0.7rem] font-bold tracking-[0.08em] opacity-45">
                        {shortRef(item.id)}
                      </span>
                      {item.task.title}
                    </h2>
                  </div>

                  {item.status === "approved" ? (
                    <span
                      className="mono flex-none rounded-full border-2 border-[var(--ink)] px-2.5 py-0.5 text-xs font-bold text-white"
                      style={{ background: "var(--green)" }}
                    >
                      +{item.coinsAwarded} coins
                    </span>
                  ) : (
                    <span className="mono flex-none rounded-full border-2 border-[var(--ink)] bg-white px-2.5 py-0.5 text-xs font-bold opacity-70">
                      {item.coinsAwarded} coins
                    </span>
                  )}
                </div>

                {/* The admin's own words, when there are any. Rendered as plain
                    text with line breaks kept — never as markup. */}
                {item.adminNote ? (
                  <div
                    className="mt-4 rounded-2xl border-2 border-[var(--ink)] p-4"
                    style={{ background: "var(--cream)" }}
                  >
                    <span className="mono text-[0.62rem] font-bold tracking-[0.16em] uppercase opacity-60">
                      Why
                    </span>
                    <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line">
                      {item.adminNote}
                    </p>
                  </div>
                ) : null}

                {state.line ? (
                  <p className="caption mt-3 text-sm">{state.line}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="mono text-[0.65rem] font-bold tracking-[0.1em] uppercase opacity-55">
                    {item.status === "pending" ? "sent" : "reviewed"}{" "}
                    {relativeTime(at, now)}
                  </span>

                  {/* Nothing to link to once it's approved — the coins are in
                      the balance and the task is finished, so a link back to it
                      only invites a second attempt that will be turned away. */}
                  {item.status === "approved" ? null : (
                    <Link
                      href={`/dashboard/inbox/${item.id}/edit`}
                      className="mono text-xs font-bold underline"
                    >
                      {item.status === "rejected"
                        ? "Fix and send again →"
                        : "Edit details →"}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
