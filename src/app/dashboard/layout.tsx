import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/guards";
import { signOut } from "@/lib/auth/actions";
import { Logo } from "@/components/brand/logo";
import { DashboardNav } from "@/components/dashboard/nav";

/* Belt and braces alongside the robots.txt disallow: a crawler that reaches a
   dashboard URL from an external link never reads robots.txt for that path, but
   it does read this. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  /* Middleware already bounced anonymous visitors, but this is what actually
     loads the profile — and it re-checks the block flag on every navigation. */
  const profile = await requireUser();

  return (
    <div className="paper min-h-svh">
      <header className="nav-pill px-5 py-4 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <Logo />

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="mono block text-[0.6rem] font-bold tracking-[0.16em] uppercase opacity-60">
                Balance
              </span>
              <span className="text-xl leading-none font-bold">
                ₹{profile.pointsBalance.toLocaleString("en-IN")}
              </span>
            </div>

            {profile.isAdmin ? (
              <Link href="/admin" className="btn-ink bg-white px-4 py-2 text-xs">
                Admin
              </Link>
            ) : null}

            <form action={signOut}>
              <button type="submit" className="btn-ink bg-white px-4 py-2 text-xs">
                Sign out
              </button>
            </form>
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-6xl">
          <DashboardNav />
        </div>
      </header>

      <main className="px-5 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
