import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Crawler policy.
 *
 * The private areas are disallowed not because they leak — the middleware and
 * the route guards already bounce anonymous requests — but because a crawler
 * that follows those links spends its budget collecting redirects to /login
 * instead of reading the pages that should rank.
 */
const PRIVATE = ["/dashboard/", "/admin/", "/auth/", "/blocked", "/verify"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE,
      },
      /* The answer-engine crawlers, allowed explicitly. Several of them read a
         bare `User-agent: *` block conservatively, and being named is also what
         makes an allow-listing legible to anyone auditing the file later. */
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-User",
          "PerplexityBot",
          "Google-Extended",
          "Applebot-Extended",
        ],
        allow: "/",
        disallow: PRIVATE,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
