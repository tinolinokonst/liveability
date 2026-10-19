// Content-Security-Policy, enforcing, built per request in proxy.ts.
//
// Scripts: nonce-based with 'strict-dynamic' — no 'unsafe-inline', no
// 'unsafe-eval' in production. Next.js puts the nonce on its own scripts
// (framework, page chunks, inline RSC payload) when it finds it in the
// request's CSP header; scripts those trusted scripts create at runtime — the
// Google Maps loader in lib/googleMaps.ts, Vercel Analytics, any extension
// PostHog loads from its EU asset host — are allowed by
// 'strict-dynamic'. Anything injected any other way (an XSS payload) is not.
// The host list after 'strict-dynamic' is ignored by modern browsers and only
// serves CSP Level 2 browsers that lack 'strict-dynamic'.
//
// Styles keep 'unsafe-inline': React renders style="" attributes in the server
// HTML (and Leaflet/framer-motion rely on inline styles), and attributes cannot
// carry a nonce. Inline styles cannot execute script, so this is the accepted
// trade-off.
//
// Scope note: only four third parties run in the browser — the Google Maps JS
// SDK (Places autocomplete, dashboard only), swisstopo map tiles, cantonal
// hazard-map tiles from geodienste.ch (img-src only), and PostHog
// (EU cloud, product analytics + session replay; see lib/analytics.ts). The
// replay recorder is bundled, so PostHog needs connect-src for ingestion and
// its asset host only as a fallback for remotely enabled extensions. Every data
// API (geo.admin.ch, geodienste.ch hazard/cadastre queries, Overpass, transport.opendata.ch, Open-Meteo, ESTV) is
// called server-side through /api/* routes, so those origins deliberately do
// NOT appear in connect-src: the browser never contacts them, and listing them
// would only widen the exfiltration surface the policy exists to close.
//
// US providers follow the same rule: the Census Geocoder and every US data
// API (Census, AirNow, AQS, NWS, BTS noise tiles, NLR, FEMA, EPA, HUD,
// FCC, MobilityDatabase) are called from /api/* routes, keyed ones with
// server-only keys, so they need no connect-src entry. The only US origin the
// BROWSER loads is the USGS base map (img-src).

// PostHog EU cloud only — a US-region key would be blocked by the policy
const POSTHOG_INGEST = 'https://eu.i.posthog.com'
const POSTHOG_ASSETS = 'https://eu-assets.i.posthog.com'

export function buildCsp(nonce: string, opts: { allowEval: boolean }): string {
  return [
    "default-src 'self'",
    [
      "script-src 'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // React uses eval in development for error stacks; never in production
      opts.allowEval ? "'unsafe-eval'" : '',
      'https://maps.googleapis.com https://maps.gstatic.com',
      POSTHOG_ASSETS,
    ].filter(Boolean).join(' '),
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    // Leaflet tiles (swisstopo WMTS) and Google Maps imagery; data:/blob: for
    // inline icons. Tiles load as <img>, so swisstopo needs img-src only — it
    // is deliberately absent from connect-src. geodienste.ch serves the cantonal
    // hazard-map overlay in the Risks modal, also as <img> tiles.
    // US addresses use the USGS National Map base map, also <img> tiles.
    "img-src 'self' data: blob: https://wmts.geo.admin.ch https://geodienste.ch https://basemap.nationalmap.gov https://*.googleapis.com https://*.gstatic.com",
    // Browser-initiated requests only: our own API routes, Supabase (auth +
    // database via the browser SDK), Google Places autocomplete XHR, and
    // PostHog EU ingestion (events, replay snapshots, remote config).
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com ${POSTHOG_INGEST} ${POSTHOG_ASSETS}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}
