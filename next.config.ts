import type { NextConfig } from "next";

// Content-Security-Policy is shipped in Report-Only mode for now.
//
// The app loads Leaflet tiles (CARTO), the Google Maps JS SDK, and Supabase over
// XHR, so a blocking policy risks breaking the map and address autocomplete.
// Report-Only lets us collect violations without user-facing breakage; once the
// reports are clean this can be promoted to `Content-Security-Policy`.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  // Google Maps SDK injects inline styles and evaluates its own bundles
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://*.googleapis.com https://*.gstatic.com https://unpkg.com",
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://maps.googleapis.com",
    "https://transport.opendata.ch",
    "https://api3.geo.admin.ch",
    "https://wms.geo.admin.ch",
    "https://overpass.osm.ch",
    "https://overpass-api.de",
    "https://overpass.kumi.systems",
    "https://air-quality-api.open-meteo.com",
  ].join(' '),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const nextConfig: NextConfig = {
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
          { key: 'Content-Security-Policy-Report-Only', value: CSP_REPORT_ONLY },
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
