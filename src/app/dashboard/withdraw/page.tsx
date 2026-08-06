import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { getPendingWithdrawalPoints, getWithdrawals } from "@/lib/queries";
import { MIN_WITHDRAWAL_POINTS } from "@/lib/validations";
import { CancelButton, WithdrawForm } from "./withdraw-form";

export const metadata: Metadata = { title: "Withdraw" };
export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const STATUS_TONE: Record<string, string> = {
  pending: "var(--yellow)",
  paid: "var(--green)",
  rejected: "var(--red)",
};

export default async function WithdrawPage() {
  const profile = await requireUser();

  const [history, locked] = await Promise.all([
    getWithdrawals(profile.id),
    getPendingWithdrawalPoints(profile.id),
  ]);

  const available = profile.pointsBalance - locked;
  const hasDestination = Boolean(profile.upiId || profile.paytmNumber);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl">Withdraw</h1>
        <p className="caption mt-1.5 text-sm">
          Requests are paid by hand to your UPI ID or Paytm number, usually the
          same day and always within 48 hours.
        </p>
      </div>

      {!hasDestination ? (
        <div className="ink-card p-6">
          <span className="sticker" style={{ background: "var(--yellow)" }}>
            One step first
          </span>
          <p className="caption mt-3 text-sm">
            Add a UPI ID or Paytm number so we know where to send the money.
          </p>
          <Link
            href="/dashboard/profile"
            className="btn-ink mt-4 inline-block px-5 py-2.5 text-sm text-white"
            style={{ background: "var(--ink)" }}
          >
            Add payment details
          </Link>
        </div>
      ) : available < MIN_WITHDRAWAL_POINTS ? (
        <div className="ink-card p-6">
          <p className="text-sm font-semibold">
            You need {MIN_WITHDRAWAL_POINTS} points to withdraw.
          </p>
          <p className="caption mt-2 text-sm">
            You have {available.toLocaleString("en-IN")}
            {locked > 0 ? ` available (${locked} locked in a pending request)` : ""}
            . Finish a few more tasks and come back.
          </p>
          <Link
            href="/dashboard"
            className="btn-ink mt-4 inline-block px-5 py-2.5 text-sm text-white"
            style={{ background: "var(--blue)" }}
          >
            Browse tasks
          </Link>
        </div>
      ) : (
        <WithdrawForm
          available={available}
          upiId={profile.upiId}
          paytmNumber={profile.paytmNumber}
        />
      )}

      {history.length > 0 ? (
        <section>
          <h2 className="text-2xl">Your requests</h2>
          <ul className="ink-card mt-4 divide-y-2 divide-[var(--ink)] overflow-hidden">
            {history.map((w) => (
              <li key={w.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      ₹{w.amountPoints.toLocaleString("en-IN")}
                      <span className="caption ml-2 font-normal uppercase">
                        {w.method}
                      </span>
                    </p>
                    <p className="caption mono mt-0.5 truncate text-[0.68rem]">
                      {w.destination} · {DATE.format(w.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-none items-center gap-3">
                    <span
                      className="mono rounded-full border-2 border-[var(--ink)] px-2.5 py-0.5 text-[0.68rem] font-bold"
                      style={{
                        background: STATUS_TONE[w.status],
                        color: w.status === "pending" ? "var(--ink)" : "#fff",
                      }}
                    >
                      {w.status}
                    </span>
                    {w.status === "pending" ? <CancelButton id={w.id} /> : null}
                  </div>
                </div>

                {w.adminNote ? (
                  <p className="caption mt-2 text-xs">Note: {w.adminNote}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
