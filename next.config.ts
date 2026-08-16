import type { NextConfig } from "next";

// Content-Security-Policy, enforcing.
//
// Every directive is expressed as 'self' plus explicit third-party origins, so
// the policy is environment-agnostic — it works identically on localhost, a
// Vercel preview URL, and the production domain, with no host hardcoded.
//
// Scope note: only two third parties run in the browser — the Google Maps JS
// SDK (Places autocomplete, dashboard only) and CARTO basemap tiles. Every data
// API (geo.admin.ch, Overpass, transport.opendata.ch, Open-Meteo, Rentcast) is
// called server-side through /api/* routes, so those origins deliberately do
// NOT appear in connect-src: the browser never contacts them, and listing them
// would only widen the exfiltration surface an enforcing policy exists to close.
const CSP = [
  "default-src 'self'",
  // Next.js hydration and the Google Maps SDK both need inline + eval
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
  // Tailwind/framer-motion/Leaflet all inject inline styles
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // Leaflet tiles (CARTO) and Google Maps imagery; data:/blob: for inline icons
  "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://*.googleapis.com https://*.gstatic.com",
  // Browser-initiated requests only: our own API routes, Supabase (auth +
  // database via the browser SDK), and Google Places autocomplete XHR.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const nextConfig: NextConfig = {
  async redirects() {
    // The legal pages briefly existed at two URLs each. These are the retired
    // duplicates; 308 so search engines and any existing links consolidate onto
    // the canonical paths.
    return [
      { source: '/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/terms-of-use', destination: '/terms', permanent: true },
    ]
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Content-Security-Policy', value: CSP },
        ],
      },
      {
        // API responses are per-user and must never be cached by a shared proxy
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, private' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ]
  },
};

export default nextConfig;
