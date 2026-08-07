"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/tasks", label: "Tasks" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/redemptions", label: "Redemptions" },
  { href: "/admin/payout-methods", label: "Payout methods" },
  { href: "/admin/maintenance", label: "Maintenance" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    /* Seven tabs will not fit a phone, so the row scrolls rather than wrapping —
       a wrapped tab strip breaks the underline into two disconnected rows and
       stops reading as tabs at all. */
    <nav className="-mx-4 -mb-px flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
      {LINKS.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-none border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap",
              active
                ? "border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
