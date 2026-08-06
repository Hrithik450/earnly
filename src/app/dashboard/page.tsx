import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { getPendingWithdrawalPoints, getTaskBoard } from "@/lib/queries";
import { MIN_WITHDRAWAL_POINTS } from "@/lib/validations";
import { Stamp } from "@/components/landing/motion";

export const metadata: Metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

const ACCENTS = ["var(--blue)", "var(--green)", "var(--red)", "var(--yellow)"];

export default async function DashboardPage() {
  const profile = await requireUser();

  const [{ available, completedIds }, locked] = await Promise.all([
    getTaskBoard(profile.id),
    getPendingWithdrawalPoints(profile.id),
  ]);

  const open = available.filter((t) => !completedIds.has(t.id));
  const done = available.filter((t) => completedIds.has(t.id));
  const spendable = profile.pointsBalance - locked;

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-3xl sm:text-4xl">
          Hi{profile.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}
        </h1>
        <p className="caption mt-1.5 text-sm">
          {open.length > 0
            ? `${open.length} task${open.length === 1 ? "" : "s"} waiting for you.`
            : "You've cleared the board — new tasks appear here as they're added."}
        </p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Total balance" value={`₹${profile.pointsBalance.toLocaleString("en-IN")}`} />
          <Stat
            label="Available to withdraw"
            value={`₹${spendable.toLocaleString("en-IN")}`}
            note={locked > 0 ? `${locked} pts in a pending request` : undefined}
          />
          <Stat label="Tasks completed" value={String(completedIds.size)} />
        </dl>

        {spendable >= MIN_WITHDRAWAL_POINTS ? (
          <Link
            href="/dashboard/withdraw"
            className="btn-ink mt-5 inline-block px-6 py-2.5 text-sm text-white"
            style={{ background: "var(--blue)" }}
          >
            Withdraw ₹{spendable.toLocaleString("en-IN")}
          </Link>
        ) : (
          <p className="caption mt-5 text-xs">
            Earn {MIN_WITHDRAWAL_POINTS - spendable} more point
            {MIN_WITHDRAWAL_POINTS - spendable === 1 ? "" : "s"} to unlock
            withdrawals.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-2xl">Open tasks</h2>

        {open.length === 0 ? (
          <div className="ink-card mt-5 p-6">
            <p className="caption text-sm">
              Nothing open right now. Check back soon.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((task, i) => {
              const accent = ACCENTS[i % ACCENTS.length];
              const onAccent =
                accent === "var(--yellow)" ? "var(--ink)" : "#fff";

              return (
                <Stamp key={task.id} delay={i * 0.05}>
                  <Link
                    href={`/dashboard/tasks/${task.slug}`}
                    className="ink-card ink-lift flex h-full flex-col p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {task.category ? (
                        <span className="mono text-[0.65rem] font-bold tracking-[0.16em] uppercase opacity-60">
                          {task.category}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span
                        className="mono flex-none rounded-full border-2 border-[var(--ink)] px-2.5 py-0.5 text-xs font-bold"
                        style={{ background: accent, color: onAccent }}
                      >
                        +{task.points} pts
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl">{task.title}</h3>

                    {task.description ? (
                      <p className="caption mt-3 flex-1 text-sm leading-relaxed">
                        {task.description}
                      </p>
                    ) : null}

                    <span className="mono mt-5 text-xs font-bold underline">
                      Start task →
                    </span>
                  </Link>
                </Stamp>
              );
            })}
          </div>
        )}
      </section>

      {done.length > 0 ? (
        <section>
          <h2 className="text-2xl">Already done</h2>
          <ul className="ink-card mt-5 divide-y-2 divide-[var(--ink)] overflow-hidden">
            {done.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <span className="text-sm font-semibold">{task.title}</span>
                <span
                  className="mono flex-none rounded-full border-2 border-[var(--ink)] px-2.5 py-0.5 text-xs font-bold text-white"
                  style={{ background: "var(--green)" }}
                >
                  +{task.points} earned
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div
      className="rounded-2xl border-2 border-[var(--ink)] p-4"
      style={{ background: "var(--cream)" }}
    >
      <dt className="mono text-[0.62rem] font-bold tracking-[0.16em] uppercase opacity-60">
        {label}
      </dt>
      <dd className="mt-1 text-2xl leading-none">{value}</dd>
      {note ? <p className="caption mt-1.5 text-xs">{note}</p> : null}
    </div>
  );
}
