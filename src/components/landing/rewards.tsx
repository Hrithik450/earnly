import { GIFT_CARDS } from "@/lib/gift-cards";
import { MAX_UPI_COINS, MIN_UPI_COINS } from "@/lib/payout-methods";
import { Rise, Stamp } from "./motion";

/**
 * What coins turn into.
 *
 * Names both payouts unconditionally. The admin toggle governs what the redeem
 * page will accept, not what this page says — at scale the offer is gift cards
 * and this copy gets rewritten then.
 */
export function Rewards() {
  return (
    <section id="rewards" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Rise>
            <div>
              <span
                className="sticker mb-4 inline-block rotate-[-2deg] shadow-[-2px_2px_0_0_var(--ink)]"
                style={{ backgroundColor: "var(--blue)", color: "#fff" }}
              >
                The rewards
              </span>
              <h2 className="text-[clamp(1.9rem,4vw,2.9rem)]">
                Your coins, as UPI cash or gift cards you&rsquo;d actually use.
              </h2>
              <p className="caption mt-5 text-lg leading-relaxed">
                Redeem from 50 coins up. Send it straight to your UPI ID, or
                pick a brand and an amount — either way a real person handles it
                and it reaches you the same day, always within 48 hours.
              </p>

              <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { k: "1 coin", v: "= ₹1" },
                  { k: "Minimum", v: "100 coins" },
                  { k: "Our Fee", v: "₹0" },
                ].map((stat) => (
                  <div
                    key={stat.k}
                    className="rounded-2xl border-2 border-[var(--ink)] p-4"
                    style={{ background: "var(--cream)" }}
                  >
                    <dt className="mono text-[0.65rem] font-bold tracking-[0.16em] uppercase opacity-60">
                      {stat.k}
                    </dt>
                    <dd className="mt-1 text-2xl">{stat.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Rise>

          <div className="grid gap-4 sm:grid-cols-2">
            <Stamp>
              <article
                className="ink-card ink-lift h-full p-5"
                style={{ background: "var(--cream)" }}
              >
                <span
                  className="sticker"
                  style={{ background: "var(--green)", color: "#fff" }}
                >
                  UPI
                </span>
                <p className="caption mt-3 text-sm leading-relaxed">
                  Straight to your UPI ID — no voucher to spend, no brand to
                  pick. Enter the ID when you redeem and the transfer follows
                  with its reference number.
                </p>
                <p className="mono mt-3 text-[0.65rem] font-bold tracking-[0.1em] uppercase opacity-55">
                  ₹{MIN_UPI_COINS} – ₹{MAX_UPI_COINS.toLocaleString("en-IN")}
                </p>
              </article>
            </Stamp>

            {GIFT_CARDS.map((card, i) => (
              <Stamp key={card.id} delay={(i + 1) * 0.06}>
                <article className="ink-card ink-lift h-full p-5">
                  <span
                    className="sticker"
                    style={{
                      background: card.accent,
                      color:
                        card.accent === "var(--yellow)" ||
                        card.accent === "var(--sky)"
                          ? "var(--ink)"
                          : "#fff",
                    }}
                  >
                    {card.name}
                  </span>
                  <p className="caption mt-3 text-sm leading-relaxed">
                    {card.blurb}
                  </p>
                  <p className="mono mt-3 text-[0.65rem] font-bold tracking-[0.1em] uppercase opacity-55">
                    ₹{card.denominations.join(" · ₹")}
                  </p>
                </article>
              </Stamp>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
