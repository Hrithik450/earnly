import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { minRedeemCoins } from "@/lib/payout-methods";
import {
  getEnabledPayoutMethods,
  getOpenSubmissionCount,
  getPendingRedemptionCoins,
  getSubmissionHistory,
  getTaskBoard,
} from "@/lib/queries";
import { relativeTime } from "@/lib/utils";
import { Stamp } from "@/components/landing/motion";
import { SubmissionList } from "@/components/dashboard/submission-list";

export const metadata: Metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

const ACCENTS = ["var(--blue)", "var(--green)", "var(--red)", "var(--yellow)"];

export default async function DashboardPage() {
  const profile = await requireUser();

  const [{ available, attempts }, locked, methods, waiting, history] =
    await Promise.all([
      getTaskBoard(profile.id),
      getPendingRedemptionCoins(profile.id),
      getEnabledPayoutMethods(),
      getOpenSubmissionCount(profile.id),
      getSubmissionHistory(profile.id),
    ]);

  /* A task stays on the board until the user has spent every attempt it allows,
     so a task worth doing three times is still open after the first two. */
  const open = available.filter((task) => {
    if (task.maxCompletions === null) return true;
    return (attempts.get(task.id)?.used ?? 0) < task.maxCompletions;
  });

  const approvedCount = [...attempts.values()].reduce(
    (sum, a) => sum + a.approved,
    0,
  );
  const spendable = profile.coinsBalance - locked;
  const minimum = minRedeemCoins(methods);

  /* One `now` for the whole render, so every relative time on the page is
     measured from the same instant rather than drifting card to card. */
  const now = new Date();
  const freshest = open.reduce<Date | null>((latest, task) => {
    const at = new Date(task.updatedAt);
    return !latest || at > latest ? at : latest;
  }, null);

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
          <Stat label="Coin balance" value={profile.coinsBalance.toLocaleString("en-IN")} />
          <Stat
            label="Ready to redeem"
            value={spendable.toLocaleString("en-IN")}
            note={locked > 0 ? `${locked} coins in a pending request` : undefined}
          />
          <Stat
            label="Tasks approved"
            value={String(approvedCount)}
            note={waiting > 0 ? `${waiting} waiting on you` : undefined}
          />
        </dl>

        {spendable >= minimum ? (
          <Link
            href="/dashboard/redeem"
            className="btn-ink mt-5 inline-block px-6 py-2.5 text-sm text-white"
            style={{ background: "var(--blue)" }}
          >
            Redeem {spendable.toLocaleString("en-IN")} coins
          </Link>
        ) : (
          <p className="caption mt-5 text-xs">
            Earn {minimum - spendable} more coin
            {minimum - spendable === 1 ? "" : "s"} to unlock your first
            redemption.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-2xl">Open tasks</h2>
        {freshest ? (
          <p className="mono mt-2 inline-flex items-center gap-2 text-xs font-bold tracking-[0.1em] uppercase opacity-70">
            <span
              className="inline-block h-2 w-2 flex-none rounded-full"
              style={{ background: "var(--green)" }}
            />
            last updated {relativeTime(freshest, now)}
          </p>
        ) : null}

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
                        +{task.coins} coins
                      </span>
                    </div>

                    <h3 className="mt-4 text-[1.4rem]">{task.title}</h3>

                    {task.description ? (
                      <p className="caption mt-3 flex-1 text-sm leading-relaxed">
                        {task.description}
                      </p>
                    ) : null}

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className="mono text-xs font-bold underline">
                        Start task →
                      </span>
                      <span className="mono text-[0.65rem] font-bold tracking-[0.1em] uppercase opacity-55">
                        {relativeTime(task.updatedAt, now)}
                      </span>
                    </div>
                  </Link>
                </Stamp>
              );
            })}
          </div>
        )}
      </section>

      <section id="submissions" className="scroll-mt-24">
        <h2 className="text-2xl">Your submissions</h2>
        <p className="caption mt-1.5 text-sm">
          {waiting > 0
            ? `${waiting} still need${waiting === 1 ? "s" : ""} attention.`
            : "Everything you've sent in, and what we said about it."}
        </p>
        <SubmissionList items={history} now={now} />
      </section>
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
