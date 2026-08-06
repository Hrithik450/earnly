import type { MetadataRoute } from "next";
import { SITE, siteUrl } from "@/lib/site";

/**
 * The web app manifest.
 *
 * A `.ts` file rather than the static `manifest.json` it replaces so `id` and
 * `start_url` can be built from the same origin the rest of the metadata uses —
 * a hardcoded start_url pointing at the wrong host makes an installed PWA open
 * a different site than the one it was installed from.
 *
 * The static version also pointed `icons` at /web-app-manifest-192x192.png and
 * /web-app-manifest-512x512.png, neither of which exists in public/ — so the
 * install prompt had no icon to show and Chrome rejected the manifest as
 * ineligible for installation.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: siteUrl(),
    name: `${SITE.name} — earn points, withdraw to UPI`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    /* Lands an installed user on their tasks rather than the marketing page —
       they have already been sold. Anonymous visitors get bounced to /login by
       the middleware, which is the correct destination for them anyway. */
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    /* --cream and --ink, so the splash screen and status bar are continuous
       with the page instead of flashing white. */
    background_color: "#f9f3ee",
    theme_color: "#f9f3ee",
    lang: "en-IN",
    dir: "ltr",
    categories: ["finance", "productivity"],
    icons: [
      /* `any` and `maskable` are listed as separate entries pointing at the
         same file: both are generated with the mark inset to 62% of the canvas,
         which survives Android's circular crop and still reads at tray size. */
      {
        src: "/images/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "My tasks", url: "/dashboard" },
      { name: "Withdraw", url: "/dashboard/withdraw" },
    ],
  };
}
