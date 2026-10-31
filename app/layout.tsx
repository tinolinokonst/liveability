import type { Metadata } from "next";
import { connection } from "next/server";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import TransitionWrapper from "@/components/TransitionWrapper";
import FooterWrapper from "@/components/FooterWrapper";
import { VisitorCountryProvider } from "@/components/VisitorCountry";
import AnalyticsIdentity from "@/components/AnalyticsIdentity";
import { FeatureFlagsProvider } from "@/components/FeatureFlags";
import { radonEnabled, usEnabled } from "@/lib/flags";

import { SITE_URL } from "@/lib/site";
import { coverageName, ogImage } from "@/lib/seo";

// Re-exported for convenience; the source of truth is lib/site.ts, which
// sitemap.ts and robots.ts also import.
export { SITE_URL };

// Site-wide defaults. Each public page sets its own title, description,
// canonical and social tags (lib/seo.ts); the signed-in and auth routes keep
// these and no canonical, rather than all claiming the homepage's.
export async function generateMetadata(): Promise<Metadata> {
  const description = `Find where to live beyond just rent. Currently available for ${coverageName()}.`;
  const image = ogImage();
  return {
    metadataBase: new URL(SITE_URL),
    title: "Liveability — Find where to live",
    description,
    openGraph: {
      type: "website",
      siteName: "Liveability",
      locale: "en_US",
      title: "Liveability — Find where to live",
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: "Liveability — Find where to live",
      description,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Render every page per request: the CSP nonce (proxy.ts) is applied during
  // server rendering, and a page prerendered at build time would ship scripts
  // without it, which the policy then blocks.
  await connection();

  // Set by Vercel's edge from the client IP (a client-sent value is
  // overwritten), so it can't be spoofed in production. Absent locally;
  // DEV_VISITOR_COUNTRY stands in for it under `next dev` to test the US
  // waitlist banner.
  const rawCountry =
    (await headers()).get("x-vercel-ip-country") ??
    (process.env.NODE_ENV === "development" ? process.env.DEV_VISITOR_COUNTRY : undefined);
  const country = rawCountry && /^[A-Za-z]{2}$/.test(rawCountry) ? rawCountry.toUpperCase() : null;

  // Server-side flags (lib/flags.ts), resolved per request and passed down
  const flags = { radon: radonEnabled(), us: usEnabled() };

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <FeatureFlagsProvider flags={flags}>
          <main className="flex-1">
            <VisitorCountryProvider country={country}>
              <TransitionWrapper>{children}</TransitionWrapper>
            </VisitorCountryProvider>
          </main>
          <FooterWrapper />
        </FeatureFlagsProvider>
        {/* PostHog itself starts in instrumentation-client.ts */}
        <AnalyticsIdentity />
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
