import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { payoutNoun } from "@/lib/payout-methods";
import {
  getEnabledGiftCardBrands,
  getEnabledPayoutMethods,
  getPendingRedemptionCoins,
  getRedemptions,
} from "@/lib/queries";
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

  const [history, locked, methods, brands] = await Promise.all([
    getRedemptions(profile.id),
    getPendingRedemptionCoins(profile.id),
    getEnabledPayoutMethods(),
    getEnabledGiftCardBrands(),
  ]);

  const available = profile.coinsBalance - locked;

  /* Gift cards with no brand left on sale would render an empty picker, so the
     method drops out of the list rather than showing as an option that leads
     nowhere. */
  const open = methods.filter((m) => m !== "gift_card" || brands.length > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl">Redeem</h1>
        <p className="caption mt-1.5 text-sm">
          Turn your coins into {payoutNoun(open)}. Every request is handled by a
          person, usually the same day and always within 48 hours.
        </p>
        <p className="caption mono mt-2 text-[0.68rem] font-bold">
          {available.toLocaleString("en-IN")} coins available
          {locked > 0
            ? ` · ${locked.toLocaleString("en-IN")} locked in a pending request`
            : ""}
        </p>
      </div>

      {open.length === 0 ? (
        <div className="ink-card p-6">
          <p className="text-sm font-semibold">
            Redeeming is paused right now.
          </p>
          <p className="caption mt-2 text-sm">
            Your coins are safe. Keep earning — you&rsquo;ll be able to spend
            them as soon as this reopens.
          </p>
        </div>
      ) : (
        /* Shown below the minimum too. The form's own locks say what the
           balance does and doesn't reach, which is more use than a card telling
           them to come back later. */
        <RedeemForm available={available} methods={open} brands={brands} />
      )}

      {history.length > 0 ? (
        <section>
          <h2 className="text-2xl">Your redemptions</h2>
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
                      {r.upiId ? ` · ${r.upiId}` : ""}
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

                {r.status === "issued" && r.payoutRef ? (
                  <p className="caption mono mt-2 text-[0.68rem]">
                    Sent · reference{" "}
                    <span className="font-bold select-all">{r.payoutRef}</span>
                  </p>
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
