import type { Metadata } from "next";
import { Anton, Geist_Mono, Instrument_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { FontFaces } from "@/components/landing/font-faces";
import "./globals.css";

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

const TITLE = "Earnly — finish small tasks, get paid to UPI";
const DESCRIPTION =
  "Complete short tasks, collect points, and withdraw straight to UPI or Paytm. 1 point = ₹1.";

export const metadata: Metadata = {
  /* metadataBase resolves the relative OG image URL below. Without it Next logs
     a warning and emits a path that crawlers can't fetch. */
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  applicationName: "Earnly",
  title: {
    default: TITLE,
    template: "%s · Earnly",
  },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Earnly",
    type: "website",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <FontFaces />
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
