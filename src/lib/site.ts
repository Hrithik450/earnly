export function siteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined) ??
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
  title: "Earnly — Complete Simple Tasks & Earn Money",
  description:
    "Complete simple online tasks, get verified, and earn real rewards. Withdraw through UPI or redeem gift cards. 1 coin = ₹1. No joining fee.",
  locale: "en_IN",
  /* Payouts are rupee-denominated, so the audience is geographically fixed —
     this drives the hreflang/geo hints and the JSON-LD areaServed. */
  country: "IN",
} as const;
