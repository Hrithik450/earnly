import { Rise, Stamp } from "./motion";

const STEPS = [
  {
    n: "01",
    accent: "var(--blue)",
    title: "Choose a task",
    body: "Pick a task you want to complete. Before you start, you'll see exactly what you need to do and how many coins you'll earn.",
  },
  {
    n: "02",
    accent: "var(--green)",
    title: "Complete it genuinely",
    body: "Follow the task instructions and submit the details we need to verify your work.",
  },
  {
    n: "03",
    accent: "var(--red)",
    title: "Get verified & paid",
    body: "We verify that the task was genuinely completed and credit your coins. Once you reach 50 coins, you can request a UPI payout or redeem a gift card.",
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
              Complete real tasks. Get rewarded.
            </h2>
            <p className="caption mx-auto mt-5 max-w-xl text-lg leading-relaxed">
              Every task is verified before you get rewarded. Complete the work
              genuinely, earn coins, and redeem them through UPI or gift cards.
              1 coin = ₹1.
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
