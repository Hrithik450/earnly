import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { MIN_REDEEM_COINS } from "@/lib/gift-cards";
import { getPendingRedemptionCoins, getRedemptions } from "@/lib/queries";
import { CancelButton, CardCode, RedeemForm } from "./redeem-form";

export const metadata: Metadata = { title: "Redeem" };
export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const STATUS_TONE: Record<string, string> = {
  pending: "var(--yellow)",
  issued: "var(--green)",
  rejected: "var(--red)",
};

export default async function RedeemPage() {
  const profile = await requireUser();

  const [history, locked] = await Promise.all([
    getRedemptions(profile.id),
    getPendingRedemptionCoins(profile.id),
  ]);

  const available = profile.coinsBalance - locked;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl">Redeem</h1>
        <p className="caption mt-1.5 text-sm">
          Turn your coins into a gift card. Codes are bought and sent by a
          person, usually the same day and always within 48 hours.
        </p>
      </div>

      {available < MIN_REDEEM_COINS ? (
        <div className="ink-card p-6">
          <p className="text-sm font-semibold">
            You need {MIN_REDEEM_COINS} coins for the smallest card.
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
        <RedeemForm available={available} />
      )}

      {history.length > 0 ? (
        <section>
          <h2 className="text-2xl">Your cards</h2>
          <ul className="ink-card mt-4 divide-y-2 divide-[var(--ink)] overflow-hidden">
            {history.map((r) => (
              <li key={r.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      ₹{r.amountCoins.toLocaleString("en-IN")}
                      <span className="caption ml-2 font-normal">
                        {r.brandName}
                      </span>
                    </p>
                    <p className="caption mono mt-0.5 text-[0.68rem]">
                      {r.amountCoins} coins · {DATE.format(r.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-none items-center gap-3">
                    <span
                      className="mono rounded-full border-2 border-[var(--ink)] px-2.5 py-0.5 text-[0.68rem] font-bold"
                      style={{
                        background: STATUS_TONE[r.status],
                        color: r.status === "pending" ? "var(--ink)" : "#fff",
                      }}
                    >
                      {r.status}
                    </span>
                    {r.status === "pending" ? <CancelButton id={r.id} /> : null}
                  </div>
                </div>

                {r.status === "issued" && r.cardCode ? (
                  <CardCode code={r.cardCode} pin={r.cardPin} />
                ) : null}

                {r.adminNote ? (
                  <p className="caption mt-2 text-xs">Note: {r.adminNote}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
