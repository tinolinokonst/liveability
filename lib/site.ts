/**
 * Canonical production origin.
 *
 * Lives here (rather than in app/layout.tsx) so sitemap.ts and robots.ts can
 * import it without pulling the root layout — and its global CSS and component
 * tree — into their module graph.
 */
export const SITE_URL = 'https://liveability.live'

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
