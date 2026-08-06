import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * The public surface only.
 *
 * Everything behind auth is deliberately absent — a sitemap is a list of pages
 * a crawler should fetch, and every /dashboard URL would just answer with a
 * redirect to /login.
 *
 * `lastModified` is stamped at build time rather than hardcoded, so a redeploy
 * after a copy change tells crawlers the page moved on. The marketing pages are
 * static, so there is no per-URL modification date to read from anywhere.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/signup"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/login"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/privacy-policy"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/terms-and-conditions"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
