import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { getLedger, getMySubmissions } from "@/lib/queries";

export const metadata: Metadata = { title: "Earnings" };
export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function EarningsPage() {
  const profile = await requireUser();

  const [ledger, mySubmissions] = await Promise.all([
    getLedger(profile.id),
    getMySubmissions(profile.id),
  ]);

  const earned = ledger
    .filter((e) => e.delta > 0)
    .reduce((sum, e) => sum + e.delta, 0);
  const redeemed = ledger
    .filter((e) => e.delta < 0)
    .reduce((sum, e) => sum - e.delta, 0);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl sm:text-4xl">Earnings</h1>
        <p className="caption mt-1.5 text-sm">
          Every coin movement on your account, newest first.
        </p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Coins earned" value={earned.toLocaleString("en-IN")} />
          <Stat label="Coins redeemed" value={redeemed.toLocaleString("en-IN")} />
          <Stat
            label="Current balance"
            value={profile.coinsBalance.toLocaleString("en-IN")}
          />
        </dl>
      </section>

      <section>
        <h2 className="text-2xl">History</h2>

        {ledger.length === 0 ? (
          <div className="ink-card mt-4 p-6">
            <p className="caption text-sm">
              Nothing yet. Finish your first task and it&rsquo;ll show up here.
            </p>
          </div>
        ) : (
          <ul className="ink-card mt-4 divide-y-2 divide-[var(--ink)] overflow-hidden">
            {ledger.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {entry.reason}
                  </p>
                  <p className="caption mono mt-0.5 text-[0.68rem]">
                    {DATE.format(entry.createdAt)}
                  </p>
                </div>
                <span
                  className="mono flex-none rounded-full border-2 border-[var(--ink)] px-2.5 py-0.5 text-xs font-bold text-white"
                  style={{
                    background:
                      entry.delta > 0 ? "var(--green)" : "var(--red)",
                  }}
                >
                  {entry.delta > 0 ? "+" : "−"}
                  {Math.abs(entry.delta)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {mySubmissions.length > 0 ? (
        <section>
          <h2 className="text-2xl">Your submissions</h2>
          <ul className="ink-card mt-4 divide-y-2 divide-[var(--ink)] overflow-hidden">
            {mySubmissions.map((sub) => (
              <li key={sub.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="truncate text-sm font-semibold">
                    {sub.task.title}
                  </p>
                  <span className="mono flex-none text-[0.68rem] opacity-60">
                    {DATE.format(sub.createdAt)}
                  </span>
                </div>
                <dl className="caption mt-2 space-y-1 text-xs">
                  {Object.entries(sub.data).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <dt className="mono flex-none opacity-60">{key}:</dt>
                      <dd className="min-w-0 break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl border-2 border-[var(--ink)] p-4"
      style={{ background: "var(--cream)" }}
    >
      <dt className="mono text-[0.62rem] font-bold tracking-[0.16em] uppercase opacity-60">
        {label}
      </dt>
      <dd className="mt-1 text-2xl leading-none">{value}</dd>
    </div>
  );
}
