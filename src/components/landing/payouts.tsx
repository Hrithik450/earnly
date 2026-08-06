import { MIN_WITHDRAWAL_POINTS } from "@/lib/validations";
import { Rise, Stamp } from "./motion";

const METHODS = [
  {
    name: "UPI",
    accent: "var(--blue)",
    body: "Any UPI ID — GPay, PhonePe, Paytm, your bank's own handle. Paid straight into the account behind it.",
  },
  {
    name: "Paytm",
    accent: "var(--sky)",
    body: "Your Paytm wallet number. Same payout, same timeline, if that is where you'd rather keep it.",
  },
];

export function Payouts() {
  return (
    <section id="payouts" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Rise>
            <div>
              <span
                className="sticker mb-4 inline-block rotate-[-2deg] shadow-[-2px_2px_0_0_var(--ink)]"
                style={{ backgroundColor: "var(--blue)", color: "#fff" }}
              >
                Getting paid
              </span>
              <h2 className="text-[clamp(1.9rem,4vw,2.9rem)]">
                Your points, in your account.
              </h2>
              <p className="caption mt-5 text-lg leading-relaxed">
                Withdraw from {MIN_WITHDRAWAL_POINTS} points up. Requests are
                reviewed and paid by a person, not a bot, which is why they take
                up to 48 hours — and why nothing gets silently swallowed by an
                automated rejection.
              </p>

              <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { k: "1 point", v: "= ₹1" },
                  { k: "Minimum", v: `${MIN_WITHDRAWAL_POINTS} pts` },
                  { k: "Payout fee", v: "₹0" },
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

          <div className="grid gap-6">
            {METHODS.map((m, i) => (
              <Stamp key={m.name} delay={i * 0.08}>
                <article className="ink-card ink-lift p-6">
                  <span
                    className="sticker"
                    style={{
                      background: m.accent,
                      color: m.accent === "var(--sky)" ? "var(--ink)" : "#fff",
                    }}
                  >
                    {m.name}
                  </span>
                  <p className="caption mt-4 text-sm leading-relaxed">
                    {m.body}
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
