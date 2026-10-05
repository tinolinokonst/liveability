import type { NextConfig } from "next";

// The Content-Security-Policy is not set here: it carries a per-request nonce,
// so proxy.ts builds it for every page (see lib/csp.ts). A static copy here
// would be sent as a second policy alongside it.

const nextConfig: NextConfig = {
  // The app never renders next/image, so image optimization is unused attack
  // surface (GHSA-2xp9-vwfh-vxw4 was an RCE in it; the actual fix is the Next.js
  // upgrade to >=16.3.3). This setting disables Next's built-in optimizer, so
  // /_next/image 404s when self-hosted with `next start`. It does NOT switch off
  // Vercel's image service, which still answers /_next/image in production —
  // limited to resizing files in /public, since no remote image sources are
  // configured.
  images: { unoptimized: true },

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
