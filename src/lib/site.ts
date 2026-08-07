/**
 * One source of truth for the public origin and the brand strings.
 *
 * The origin was previously read from `process.env` in three places with three
 * copies of the same fallback; metadata, robots.txt, the sitemap and the auth
 * redirect all have to agree on it or crawlers index one host while
 * verification emails point at another.
 */

/**
 * The canonical public origin, with no trailing slash.
 *
 * `NEXT_PUBLIC_SITE_URL` wins because it is the only value that can name the
 * apex domain — `VERCEL_URL` is the per-deployment hostname, so on a preview it
 * is the right host but on production it is the deployment alias rather than
 * the domain a user typed. It is used as a fallback so preview builds still
 * produce absolute, fetchable OG image URLs instead of localhost.
 */
export function siteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    "http://localhost:3000";

  return configured.replace(/\/+$/, "");
}

/** Absolute URL for a site-relative path — for JSON-LD, which cannot use metadataBase. */
export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE = {
  name: "Earnly",
  /* Under 60 characters so it survives Google's title truncation intact. */
  title: "Earnly — finish small tasks, get gift cards",
  description:
    "Complete short tasks, collect coins, and swap them for Amazon Pay, Flipkart or Google Play gift cards. 1 coin = ₹1 of card value, no joining fee.",
  locale: "en_IN",
  /* Cards are rupee-denominated Indian brands, so the audience is
     geographically fixed — this drives the hreflang/geo hints and the JSON-LD
     areaServed. */
  country: "IN",
} as const;
