/**
 * Canonical production origin.
 *
 * Lives here (rather than in app/layout.tsx) so sitemap.ts and robots.ts can
 * import it without pulling the root layout — and its global CSS and component
 * tree — into their module graph.
 */
export const SITE_URL = 'https://liveability.live'

/**
 * Base origin to use for Supabase auth redirect links (email confirmation,
 * magic links, password resets).
 *
 * Always SITE_URL in production. In the browser on localhost it returns the
 * current origin instead, so a confirmation email opened during local
 * development lands on the local callback rather than production. Any origin
 * used here must also be listed under Redirect URLs in the Supabase dashboard.
 */
export function getAuthRedirectBase(): string {
  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1') return origin
  }
  return SITE_URL
}

/**
 * Full URL Supabase should send auth emails back to. `next` is where the
 * callback forwards once the code is exchanged (e.g. /auth/reset for password
 * recovery); omitted, the callback defaults to /dashboard.
 */
export function authCallbackUrl(next?: string): string {
  const base = `${getAuthRedirectBase()}/auth/callback`
  return next ? `${base}?next=${encodeURIComponent(next)}` : base
}

/**
 * Returns `raw` only if it is a same-site relative path, otherwise null.
 *
 * The callback reads `next` from the query string, so without this anyone could
 * craft a real Liveability link that bounces a user to an arbitrary site after
 * sign-in (an open redirect). Rejected: absolute URLs, protocol-relative "//x",
 * and "/\x" — browsers normalise the backslash, so "/\evil.com" is treated as
 * "//evil.com". As a final guard the path is resolved against a dummy origin and
 * must still land on that origin.
 */
export function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/')) return null
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null
  if (/[\x00-\x1F\x7F]/.test(raw)) return null
  try {
    const probe = new URL(raw, 'https://same-origin.invalid')
    if (probe.origin !== 'https://same-origin.invalid') return null
    return probe.pathname + probe.search + probe.hash
  } catch {
    return null
  }
}

/**
 * Public, indexable routes. Authenticated areas (/dashboard, /settings) and
 * /auth are deliberately excluded and are additionally disallowed in robots.ts.
 */
export const PUBLIC_ROUTES = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' as const },
  { path: '/how-it-works', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/cookie-policy', priority: 0.3, changeFrequency: 'yearly' as const },
]
