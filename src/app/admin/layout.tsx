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
    <div className="bg-muted/30 min-h-svh">
      <header className="bg-background border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-sm font-semibold tracking-tight"
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
            <span className="text-muted-foreground text-xs">
              {admin.email}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">User view</Link>
            </Button>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6">
          <AdminNav />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
