import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { signOut } from "@/lib/auth/actions";
import { requireAdmin } from "@/lib/auth/guards";
import { AdminNav } from "@/components/admin/nav";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The admin shell.
 *
 * Deliberately outside `.paper` — this uses the stock shadcn neutral theme, flat
 * borders and no motion. The neo-brutalist landing treatment does not belong on
 * a tool someone uses for an hour at a time.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="admin-shell bg-muted/30 min-h-svh">
      <header className="bg-background border-b">
        {/* Stacks below sm: identity on top, actions beneath as a full-width
            row. Previously the email and both buttons competed for one line and
            the buttons were pushed to a cramped second row mid-label. */}
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admin"
              className="flex flex-none items-center gap-2 text-sm font-semibold tracking-tight"
            >
              {/* The mark only, at text size — the landing `Logo` carries the
                  heading face and the red dot, both of which are defined inside
                  `.paper` and would render unstyled here. */}
              <Image
                src="/images/earnly-mark.png"
                alt=""
                width={20}
                height={20}
                aria-hidden
              />
              Earnly Admin
            </Link>
            {/* Truncates rather than wraps — a long address would otherwise push
                the row to two lines on a phone. */}
            <span className="text-muted-foreground min-w-0 truncate text-xs">
              {admin.email}
            </span>
          </div>

          <div className="flex flex-none items-center gap-2">
            {/* Buttons share the row equally on mobile so neither is a tiny
                tap target; they return to intrinsic width from sm up. */}
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Link href="/dashboard">User view</Link>
            </Button>
            <form action={signOut} className="flex-1 sm:flex-none">
              <Button type="submit" variant="ghost" size="sm" className="w-full sm:w-auto">
                Sign out
              </Button>
            </form>
          </div>
        </div>

        <div className="mx-auto mt-2 max-w-7xl px-4 sm:mt-0 sm:px-6">
          <AdminNav />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
