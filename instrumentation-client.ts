// Runs in the browser before the app becomes interactive (Next.js
// instrumentation-client convention). Starts PostHog; see lib/analytics.ts for
// the privacy configuration.
import posthog from 'posthog-js'
// Bundle the session-replay recorder instead of letting the SDK fetch it from
// PostHog's CDN at runtime, so no remote script runs on our pages.
import 'posthog-js/dist/posthog-recorder'
import { POSTHOG_CONFIG } from '@/lib/analytics'

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY

if (key) {
  try {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      ...POSTHOG_CONFIG,
    })
  } catch (err) {
    // Analytics must never break the app
    console.error('[analytics] PostHog init failed', err)
  }
}
