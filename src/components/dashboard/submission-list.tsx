import Link from "next/link";
import type { getSubmissionHistory } from "@/lib/queries";
import { relativeTime, shortRef } from "@/lib/utils";

/**
 * Everything the user has sent in, and what was said about it.
 *
 * This lived on its own /dashboard/inbox page for a while. It reads better
 * here: earnings and redemptions each keep their own history beneath the thing
 * that produces it, and a submission is the history of a task — so it belongs
 * under the task board rather than in a separate destination that has to be
 * remembered and navigated to.
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

export function SubmissionList({
  items,
  now,
}: {
  items: Awaited<ReturnType<typeof getSubmissionHistory>>;
  /** Passed in so every relative time on the page shares one instant. */
  now: Date;
}) {
  if (items.length === 0) {
    return (
      <div className="ink-card mt-4 p-6">
        <p className="caption text-sm">
          Nothing sent yet. Pick a task above and its result shows up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-4">
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
                <h3 className="mt-2.5 text-xl">
                  <span className="mono mr-2 align-middle text-[0.7rem] font-bold tracking-[0.08em] opacity-45">
                    {shortRef(item.id)}
                  </span>
                  {item.task.title}
                </h3>
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

              {/* Nothing to change once it's approved — the coins are in the
                  balance and the task is finished. */}
              {item.status === "approved" ? null : (
                <Link
                  href={`/dashboard/tasks/submissions/${item.id}/edit`}
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
  );
}
