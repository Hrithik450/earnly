import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Float, Rise } from "./motion";

/**
 * The close. No card and no panel — the headline sits directly on the page with
 * the labels scattered around it, so the last thing on the page is the lightest.
 *
 * The labels are absolutely positioned and hidden below `md`, where there is no
 * margin beside the headline to hold them without overlapping the text.
 */
export function Footer({ signedIn }: { signedIn: boolean }) {
  return (
    <footer className="pt-8">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative py-12 sm:py-20">
          <Float
            distance={6}
            duration={6}
            delay={0.4}
            className="absolute bottom-24 left-0 hidden md:block lg:left-10 xl:left-24"
          >
            <span
              className="sticker sticker-oval sticker-label rotate-[-14deg] shadow-[-2px_2px_0_0_var(--ink)]"
              style={{ backgroundColor: "var(--red)", color: "#fff" }}
            >
              No joining
              <br />
              fee
            </span>
          </Float>

          {/* Kept on one line so the ellipse stretches wide rather than rounding
              up into a circle — the wrapped two-line version read as a bubble. */}
          <Float
            distance={7}
            duration={5.5}
            delay={0.9}
            className="absolute top-16 right-0 hidden md:block lg:top-20 lg:right-6"
          >
            <span
              className="sticker sticker-oval sticker-label rotate-[11deg] whitespace-nowrap shadow-[-2px_2px_0_0_var(--ink)]"
              style={{ backgroundColor: "var(--green)", color: "#fff" }}
            >
              1 point = ₹1
            </span>
          </Float>

          <Float
            distance={5}
            duration={4.5}
            delay={0.2}
            className="absolute top-6 left-[12%] hidden lg:block xl:left-[8%]"
          >
            <Spark className="h-7 w-7 rotate-[-18deg]" />
          </Float>

          <Float
            distance={6}
            duration={5}
            delay={1.2}
            className="absolute right-[10%] bottom-16 hidden lg:block xl:right-[6%]"
          >
            <Spark className="h-9 w-9 rotate-[14deg]" />
          </Float>

          <Rise>
            <h2 className="mx-auto max-w-2xl text-center text-[clamp(2rem,5vw,3.5rem)] leading-[1.1]">
              Start earning today — choose a task, complete it genuinely, and
              get rewarded once your work is verified.
            </h2>
          </Rise>

          <Rise delay={0.16}>
            <div className="mt-9 flex justify-center">
              <Link
                href={signedIn ? "/dashboard" : "/signup"}
                className="btn-ink px-11 py-4 text-lg text-white"
                style={{ backgroundColor: "var(--blue)" }}
              >
                {signedIn ? "Go to my dashboard" : "Get started"}
              </Link>
            </div>
          </Rise>
        </div>
      </div>

      <div className="footer-slab mt-8 px-7 pt-10 pb-8 sm:px-12 sm:pt-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <Logo size="lg" />
              <p className="mono mt-3 max-w-md text-xs leading-relaxed font-bold opacity-70 sm:text-sm">
                Complete simple online tasks, get verified, and earn real
                rewards. Withdraw through UPI or redeem gift cards. 1 coin = ₹1.
                No joining fee.
              </p>
            </div>

            <Link
              href={signedIn ? "/dashboard" : "/signup"}
              className="group flex flex-none items-center gap-4"
            >
              <span className="footer-cta text-[clamp(1.3rem,3vw,2rem)] leading-none">
                {signedIn ? "Open dashboard" : "Start earning"}
              </span>
              <span
                className="footer-arrow flex h-12 w-12 flex-none items-center justify-center rounded-full border-2 border-[var(--ink)] sm:h-14 sm:w-14"
                style={{ background: "var(--blue)" }}
                aria-hidden
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6">
                  <path
                    d="M4 12h15M13 6l6 6-6 6"
                    fill="none"
                    stroke="var(--yellow)"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          </div>

          <p className="mono mt-14 text-right text-xs leading-relaxed font-bold opacity-70 sm:mt-20">
            P.S. Every payout on this page is sent by a person, not a bot.
          </p>

          <div className="mono mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t-2 border-[var(--ink)] pt-6 text-xs font-bold">
            <span className="opacity-70">
              © {new Date().getFullYear()} Earnly. All rights reserved.
            </span>
            <Link href="/privacy-policy" className="footer-link">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="footer-link">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
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
