"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Tasks" },
  { href: "/dashboard/earnings", label: "Earnings" },
  { href: "/dashboard/withdraw", label: "Withdraw" },
  { href: "/dashboard/profile", label: "Profile" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {LINKS.map((link) => {
        /* Exact match for the index, prefix match elsewhere — otherwise
           /dashboard stays highlighted on every sub-page. */
        const active =
          link.href === "/dashboard"
            ? pathname === "/dashboard" ||
              pathname.startsWith("/dashboard/tasks")
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full border-2 border-[var(--ink)] px-4 py-1.5 text-sm font-semibold transition-colors",
              active ? "text-white" : "bg-white hover:bg-[var(--cream)]",
            )}
            style={active ? { background: "var(--ink)" } : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
