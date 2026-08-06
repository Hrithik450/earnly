import type { Metadata, Viewport } from "next";
import { Anton, Geist_Mono, Instrument_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { FontFaces } from "@/components/landing/font-faces";
import { SITE, absoluteUrl, siteUrl } from "@/lib/site";
import "./globals.css";

/* Site-relative: `metadataBase` below turns it into the absolute URL that
   unfurlers require, so this stays correct across localhost, previews and
   production without a second env var. */
const OG_IMAGE = "/images/opengraph-image.png";

/**
 * Free stand-ins for the two commercial faces the design was drawn with.
 *
 * `--font-display` and `--font-sans` are the fallbacks inside `--font-heading`
 * and `--font-caption` (see globals.css), so dropping the licensed .woff2 files
 * into public/fonts/ upgrades the type with no code change — FontFaces only
 * emits @font-face for files that actually exist.
 *
 * Anton stands in for Palo Compressed Bold: condensed, single weight, drawn
 * heavy. Instrument Sans stands in for Banda Nova.
 */
const display = Anton({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const sans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const TITLE = SITE.title;
const DESCRIPTION = SITE.description;

export const metadata: Metadata = {
  /* metadataBase resolves every relative URL below — OG image, canonical,
     alternates. Without it Next logs a warning and emits paths that crawlers
     and link unfurlers cannot fetch. */
  metadataBase: new URL(siteUrl()),
  applicationName: SITE.name,
  title: {
    default: TITLE,
    template: `%s · ${SITE.name}`,
  },
  description: DESCRIPTION,
  /* Answers "what is this page about" for both search and the LLM crawlers,
     which lean on keywords far more than Google does. */
  keywords: [
    "earn money online India",
    "complete tasks for money",
    "UPI payout app",
    "Paytm earning app",
    "micro tasks India",
    "earn points redeem cash",
    "no investment earning app",
  ],
  authors: [{ name: SITE.name, url: siteUrl() }],
  creator: SITE.name,
  publisher: SITE.name,
  /* Self-referencing canonical on the home page; every other route sets its own
     via the `alternates` in its own metadata export. */
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE.name,
    type: "website",
    locale: SITE.locale,
    url: "/",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE.name} — finish small tasks, get paid to UPI`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/images/earnly-mark.png", type: "image/png", sizes: "162x162" },
    ],
    apple: [{ url: "/images/apple-icon.png", sizes: "180x180" }],
  },
  /* No `manifest` key here — the app/manifest.ts file convention emits the
     <link rel="manifest"> itself, and setting both renders it twice. */
  /* No `nocache`: the large-preview directives are what get the OG image shown
     in a search result rather than a text-only row. */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "finance",
  /* The payouts are rupees to Indian UPI handles, so the service is genuinely
     region-locked. Declaring it stops the page competing for queries in markets
     where nobody could use it. */
  other: {
    "geo.region": "IN",
    "geo.placename": "India",
  },
};

export const viewport: Viewport = {
  /* Matches --cream, so the mobile browser chrome continues the page instead of
     framing it in white. */
  themeColor: "#f9f3ee",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <head>
        <FontFaces />
        {/* Organization + WebSite in one graph, so the two nodes can reference
            each other by @id rather than repeating the publisher inline.
            Rendered here rather than on the page so it covers every route.

            dangerouslySetInnerHTML is the documented way to emit JSON-LD in
            React — the content is a stringified literal built from our own
            constants, with no user input anywhere in it. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": absoluteUrl("/#organization"),
                  name: SITE.name,
                  url: siteUrl(),
                  logo: {
                    "@type": "ImageObject",
                    url: absoluteUrl("/images/earnly-logo.png"),
                    width: 250,
                    height: 250,
                  },
                  description: SITE.description,
                  areaServed: {
                    "@type": "Country",
                    name: "India",
                  },
                },
                {
                  "@type": "WebSite",
                  "@id": absoluteUrl("/#website"),
                  url: siteUrl(),
                  name: SITE.name,
                  description: SITE.description,
                  publisher: { "@id": absoluteUrl("/#organization") },
                  inLanguage: "en-IN",
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${sans.variable} ${display.variable} ${mono.variable} antialiased`}
      >
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
