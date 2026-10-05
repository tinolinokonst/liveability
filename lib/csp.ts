// Content-Security-Policy, enforcing, built per request in proxy.ts.
//
// Scripts: nonce-based with 'strict-dynamic' — no 'unsafe-inline', no
// 'unsafe-eval' in production. Next.js puts the nonce on its own scripts
// (framework, page chunks, inline RSC payload) when it finds it in the
// request's CSP header; scripts those trusted scripts create at runtime — the
// Google Maps loader in lib/googleMaps.ts, Vercel Analytics — are allowed by
// 'strict-dynamic'. Anything injected any other way (an XSS payload) is not.
// The host list after 'strict-dynamic' is ignored by modern browsers and only
// serves CSP Level 2 browsers that lack 'strict-dynamic'.
//
// Styles keep 'unsafe-inline': React renders style="" attributes in the server
// HTML (and Leaflet/framer-motion rely on inline styles), and attributes cannot
// carry a nonce. Inline styles cannot execute script, so this is the accepted
// trade-off.
//
// Scope note: only two third parties run in the browser — the Google Maps JS
// SDK (Places autocomplete, dashboard only) and swisstopo map tiles. Every data
// API (geo.admin.ch, Overpass, transport.opendata.ch, Open-Meteo, ESTV) is
// called server-side through /api/* routes, so those origins deliberately do
// NOT appear in connect-src: the browser never contacts them, and listing them
// would only widen the exfiltration surface the policy exists to close.

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
    ].filter(Boolean).join(' '),
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    // Leaflet tiles (swisstopo WMTS) and Google Maps imagery; data:/blob: for
    // inline icons. Tiles load as <img>, so swisstopo needs img-src only — it
    // is deliberately absent from connect-src.
    "img-src 'self' data: blob: https://wmts.geo.admin.ch https://*.googleapis.com https://*.gstatic.com",
    // Browser-initiated requests only: our own API routes, Supabase (auth +
    // database via the browser SDK), and Google Places autocomplete XHR.
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}
