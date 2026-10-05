import type { Metadata } from "next";
import { connection } from "next/server";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import TransitionWrapper from "@/components/TransitionWrapper";
import FooterWrapper from "@/components/FooterWrapper";

import { SITE_URL } from "@/lib/site";

// Re-exported for convenience; the source of truth is lib/site.ts, which
// sitemap.ts and robots.ts also import.
export { SITE_URL };

const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Liveability — real data on where you're moving in Switzerland",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Liveability — Find where to live",
  description:
    "Browse area rankings and address-level scores for air quality, walkability, green space, grocery access, and transit. Currently available for Switzerland.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Liveability",
    locale: "en_US",
    url: "/",
    title: "Liveability — Find where to live",
    description: "Find where to live beyond just rent. Currently available for Switzerland.",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Liveability — Find where to live",
    description: "Find where to live beyond just rent. Currently available for Switzerland.",
    images: [OG_IMAGE.url],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Render every page per request: the CSP nonce (proxy.ts) is applied during
  // server rendering, and a page prerendered at build time would ship scripts
  // without it, which the policy then blocks.
  await connection();

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <main className="flex-1">
          <TransitionWrapper>{children}</TransitionWrapper>
        </main>
        <FooterWrapper />
        {/* Production loads the script from same-origin /_vercel/insights; it is
            created by the bundled component, so the CSP's 'strict-dynamic'
            admits it. In development the package instead pulls a debug script
            from va.vercel-scripts.com and tracks nothing, so it is only
            rendered in production.
            Page views alone use no cookies or storage, as the privacy and cookie
            policies state; calling va identify/group or enableCookie would write
            to the browser and make those policies false. */}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
