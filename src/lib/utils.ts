import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * A short relative age like "2h ago" or "3d ago".
 *
 * Deliberately coarse: anything under a minute reads as "just now" and anything
 * past a month falls back to a plain date, because "37d ago" is harder to place
 * than "4 Jul". Rendered on the server, so the string is fixed at request time
 * rather than ticking — a live-updating clock would force the whole section to
 * become a client component for no real gain.
 */
export function relativeTime(value: Date | string, now: Date = new Date()) {
  const then = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  /* A clock skew between the database and the server can put a freshly written
     row a few seconds into the future; showing "in 3 seconds" for it is worse
     than rounding to "just now". */
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days <= 30) return `${days}d ago`;

  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
