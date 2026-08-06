import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

/**
 * The auth shell. `.paper` is applied here rather than in the root layout so
 * that /admin — which must stay on the stock shadcn theme — never inherits it.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="paper min-h-screen">
      <div className="hero-grid min-h-screen px-5 py-8 sm:py-14">
        <div className="mx-auto w-full max-w-md">
          <Logo className="mb-8" />

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
