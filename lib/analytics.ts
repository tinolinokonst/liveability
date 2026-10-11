// Product analytics (PostHog, EU cloud) for UX research.
//
// Privacy rules this module enforces, matching the privacy and cookie policies:
// - Cookieless: persistence is in memory only — no cookies, no local or session
//   storage. Each page load starts a fresh anonymous ID until identify().
// - Signed-in users are identified by their Supabase user ID only, never email.
// - Events are a closed, typed list below; no property carries personal data.
//   Never add the address, search text, email or any household/income value.
// - Session replay masks every input, blocks the income field outright, and
//   masks the text of everything derived from income (see SENSITIVE_* below).
//   Network bodies and query strings are dropped before a replay is sent.
// - Autocapture is off: it records clicked elements' text, which could
//   include budget figures. Only the events below are sent.
// - Do Not Track is respected: with DNT on, nothing is captured or recorded.

import posthog from 'posthog-js'
import type { CapturedNetworkRequest, CaptureResult, PostHogConfig } from 'posthog-js'

/** Every event and the only properties it may carry. */
export interface AnalyticsEvents {
  signup_completed: undefined
  address_search_completed: undefined
  search_validation_failed: undefined
  metric_opened: { metric: string }
  map_fullscreen_opened: undefined
  radius_changed: { radius: number }
  address_saved: undefined
  comparison_viewed: { count: number }
  ai_match_submitted: undefined
  ai_match_result_clicked: { rank: number }
  /** Fires when an income is first entered. Never carries the value. */
  budget_income_entered: undefined
  waitlist_signup: { city: string; state: string }
}

/**
 * Replay masking. `ph-mask` (rrweb's maskTextClass) replaces the text of an
 * element and all its descendants with asterisks; `ph-no-capture` (blockClass)
 * drops the element from the recording entirely, leaving an empty box.
 * - SENSITIVE_TEXT: wrap anything that shows income or a figure derived from
 *   it (tax, contributions, what's left, AI Match answers that may quote them).
 * - SENSITIVE_BLOCK: the income input itself, so not even its length is kept.
 */
export const SENSITIVE_TEXT = 'ph-mask'
export const SENSITIVE_BLOCK = 'ph-no-capture'

const URL_PROPERTIES = ['$current_url', '$referrer', '$initial_referrer', '$initial_current_url', '$session_entry_url', '$session_entry_referrer']

/** Origin + path only: query strings can hold auth codes or search terms. */
function stripUrl(value: unknown): unknown {
  if (typeof value !== 'string' || !value.startsWith('http')) return value
  try {
    const u = new URL(value)
    return `${u.origin}${u.pathname}`
  } catch {
    return value
  }
}

function scrubUrls(props: Record<string, unknown> | undefined) {
  if (!props) return
  for (const key of URL_PROPERTIES) {
    if (key in props) props[key] = stripUrl(props[key])
  }
}

function beforeSend(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event
  scrubUrls(event.properties)
  scrubUrls(event.$set as Record<string, unknown> | undefined)
  scrubUrls(event.$set_once as Record<string, unknown> | undefined)
  return event
}

/** Replay network capture: keep timing and status, drop bodies, headers and queries. */
function maskNetworkRequest(req: CapturedNetworkRequest): CapturedNetworkRequest {
  return {
    ...req,
    name: String(stripUrl(req.name)),
    requestBody: undefined,
    responseBody: undefined,
    requestHeaders: undefined,
    responseHeaders: undefined,
  }
}

export const POSTHOG_CONFIG: Partial<PostHogConfig> = {
  ui_host: 'https://eu.posthog.com',
  defaults: '2026-08-30',
  persistence: 'memory',
  respect_dnt: true,
  person_profiles: 'identified_only',
  autocapture: false,
  capture_pageview: 'history_change',
  capture_exceptions: false,
  capture_dead_clicks: false,
  disable_surveys: true,
  mask_all_text: true,
  mask_all_element_attributes: true,
  mask_personal_data_properties: true,
  before_send: beforeSend,
  session_recording: {
    maskAllInputs: true,
    // Belt and braces: even if an input escaped maskAllInputs, its value is
    // replaced. maskAllInputs set here overrides the project setting.
    maskInputFn: text => '*'.repeat(text.length),
    maskTextClass: SENSITIVE_TEXT,
    blockClass: SENSITIVE_BLOCK,
    recordHeaders: false,
    recordBody: false,
    maskCapturedNetworkRequestFn: maskNetworkRequest,
  },
}

/** Send one of the events above. A no-op until PostHog is initialised (no key, DNT, server). */
export function capture<E extends keyof AnalyticsEvents>(
  event: E,
  ...props: AnalyticsEvents[E] extends undefined ? [] : [AnalyticsEvents[E]]
): void {
  if (typeof window === 'undefined' || !posthog.__loaded) return
  posthog.capture(event, props[0])
}

/** Tie later events to a signed-in user — Supabase user ID only, no traits. */
export function identifyUser(userId: string): void {
  if (!posthog.__loaded || posthog.get_distinct_id() === userId) return
  posthog.identify(userId)
}

export function resetUser(): void {
  if (posthog.__loaded) posthog.reset()
}
