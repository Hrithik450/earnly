import Link from "next/link";
import { Float, Rise } from "./motion";

/**
 * Centred headline, then a drawn mock of the earnings card beneath it.
 *
 * The card is built from the same `.ink-card` primitives as the real dashboard
 * rather than shipped as a screenshot, so it can never drift out of date and
 * costs no image bytes.
 */
export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="hero-grid isolate relative overflow-hidden px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
      <div className="mx-auto max-w-5xl text-center">
        <Rise onMount>
          <h1 className="text-[clamp(2.4rem,5.8vw,4.4rem)] leading-[0.98]">
            Small Tasks In.
            <br />
            Real <span className="underline-swash">Gift Cards</span> Out.
          </h1>
        </Rise>

        <Rise onMount delay={0.08}>
          <p className="caption mx-auto mt-8 max-w-2xl text-[clamp(0.95rem,1.6vw,1.15rem)] leading-relaxed">
            Finish a task, collect coins the same second, swap them for an
            Amazon Pay, Flipkart or Google Play card. 1 coin = ₹1 of card value,
            no conversion games.
          </p>
        </Rise>

        <Rise onMount delay={0.16}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={signedIn ? "/dashboard" : "/signup"}
              className="btn-ink px-8 py-3.5 text-base text-white"
              style={{ backgroundColor: "var(--blue)" }}
            >
              {signedIn ? "Go to my tasks" : "Start earning free"}
            </Link>
            <a href="#how" className="btn-ink bg-white px-7 py-3.5 text-base">
              See how it works
            </a>
          </div>
        </Rise>
      </div>

      <div className="relative mx-auto mt-20 max-w-3xl">
        <Rise onMount delay={0.24}>
          <Float distance={7}>
            <div className="fade-out-bottom">
              <BalanceMock />
            </div>
          </Float>
        </Rise>

        <Float
          distance={6}
          duration={6}
          delay={0.6}
          className="absolute -top-5 -left-2 hidden sm:block lg:-left-10"
        >
          <span
            className="sticker rotate-[-7deg] shadow-[-2px_2px_0_0_var(--ink)]"
            style={{ backgroundColor: "var(--sky)" }}
          >
            No joining fee, ever
          </span>
        </Float>

        <Float
          distance={7}
          duration={5.5}
          delay={1.1}
          className="absolute -right-2 -bottom-5 hidden sm:block lg:-right-10"
        >
          <span
            className="sticker rotate-[-7deg] shadow-[-2px_2px_0_0_var(--ink)]"
            style={{ backgroundColor: "var(--green)", color: "#fff" }}
          >
            Coins credit instantly
          </span>
        </Float>

        <Float
          distance={5}
          duration={4.5}
          delay={0.3}
          className="absolute -top-9 right-10 hidden md:block"
        >
          <Spark className="h-8 w-8 rotate-[16deg]" />
        </Float>
      </div>
    </section>
  );
}

/** A drawn stand-in for the real dashboard balance card. */
function BalanceMock() {
  const rows = [
    { label: "Follow us on Instagram", pts: 10, tone: "var(--green)" },
    { label: "Rate the app on Play Store", pts: 50, tone: "var(--blue)" },
    { label: "2-minute product survey", pts: 25, tone: "var(--red)" },
  ];

  return (
    <div className="ink-card overflow-hidden">
      <div
        className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-[var(--ink)] p-6"
        style={{ background: "var(--cream)" }}
      >
        <div className="text-left">
          <span className="mono text-[0.65rem] font-bold tracking-[0.16em] uppercase opacity-60">
            Coins ready to redeem
          </span>
          <p className="mt-1 text-[clamp(2.2rem,6vw,3.2rem)] leading-none">
            1,240
          </p>
        </div>
        <span className="btn-ink px-5 py-2.5 text-sm text-black bg-white">
          Redeem a card
        </span>
      </div>

      <ul className="divide-y-2 divide-[var(--ink)]">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-4 px-6 py-4 text-left"
          >
            <span className="text-sm font-semibold">{row.label}</span>
            <span
              className="mono flex-none rounded-full border-2 border-[var(--ink)] px-2.5 py-0.5 text-xs font-bold text-white"
              style={{ background: row.tone }}
            >
              +{row.pts}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Spark({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z"
        fill="var(--yellow)"
        stroke="var(--ink)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
