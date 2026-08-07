import { Rise, Stamp } from "./motion";

const STEPS = [
  {
    n: "01",
    accent: "var(--blue)",
    title: "Pick a task",
    body: "Every task shows exactly what it pays before you start. No bidding, no hidden tiers, no waiting for an offer wall to load.",
  },
  {
    n: "02",
    accent: "var(--green)",
    title: "Send your proof",
    body: "Each task has a short form — a username, a screenshot link, a couple of answers. Submit it and the coins land the same second.",
  },
  {
    n: "03",
    accent: "var(--red)",
    title: "Pick your card",
    body: "From 100 coins up, choose a brand and an amount. We buy the card by hand and send you the code within 48 hours.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <Rise>
          <div className="mx-auto max-w-3xl text-center">
            <span
              className="sticker mb-4 inline-block rotate-[3deg] shadow-[-2px_2px_0_0_var(--ink)]"
              style={{ backgroundColor: "var(--green)", color: "#fff" }}
            >
              How it works
            </span>
            <h2 className="text-[clamp(1.9rem,4vw,2.9rem)]">
              Three steps, and the maths is boring on purpose.
            </h2>
            <p className="caption mx-auto mt-5 max-w-xl text-lg leading-relaxed">
              1 coin is ₹1 of card value. That is the whole exchange rate —
              nothing to convert, nothing that quietly loses value while you
              save up.
            </p>
          </div>
        </Rise>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Stamp key={step.n} delay={i * 0.08}>
              <article className="ink-card ink-lift flex h-full flex-col p-6">
                <span
                  className="mono inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--ink)] text-sm font-black text-white"
                  style={{ backgroundColor: step.accent }}
                >
                  {step.n}
                </span>
                <h3 className="mt-5 text-[1.4rem]">{step.title}</h3>
                <p className="caption mt-3 text-sm leading-relaxed">
                  {step.body}
                </p>
              </article>
            </Stamp>
          ))}
        </div>
      </div>
    </section>
  );
}
