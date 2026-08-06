import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The auth shell. `.paper` is applied here rather than in the root layout so
 * that /admin — which must stay on the stock shadcn theme — never inherits it.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="paper min-h-screen">
      <div className="hero-grid min-h-screen px-5 py-8 sm:py-14">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="display mb-8 inline-flex items-baseline gap-1.5 text-2xl"
          >
            Earnly
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--red)" }}
            />
          </Link>

          {children}

          <p className="caption mt-8 text-center text-xs">
            By continuing you agree that payouts are processed manually and may
            take up to 48 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
