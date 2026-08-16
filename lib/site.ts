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

/** Full URL Supabase should send auth emails back to. */
export function authCallbackUrl(): string {
  return `${getAuthRedirectBase()}/auth/callback`
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
