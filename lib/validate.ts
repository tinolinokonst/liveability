// Shared input validation for API routes.
//
// Every value that reaches an upstream provider (Google Maps, Google News,
// Overpass, Anthropic) is bounded here first, so a caller cannot push
// arbitrarily large or malformed strings through our server into a paid or
// rate-limited third-party API.

/** Max characters accepted for a free-text address query. */
export const MAX_ADDRESS_LENGTH = 200

/** Max characters accepted for a news search term. */
export const MAX_NEWS_QUERY_LENGTH = 120

/** Max characters accepted for an AI Match lifestyle description. */
export const MAX_DESCRIPTION_LENGTH = 1000

/** Max raw request body size (bytes) accepted on JSON POST routes. */
export const MAX_JSON_BODY_BYTES = 8 * 1024

/**
 * Normalize a free-text query parameter: trims, rejects empty values, rejects
 * anything over the cap, and strips control characters (which have no place in
 * an address or search term and can confuse upstream parsers/log readers).
 */
export function cleanQueryText(
  raw: string | null,
  maxLength: number
): { ok: true; value: string } | { ok: false; error: string } {
  if (raw === null) return { ok: false, error: 'Missing required parameter' }

  // eslint-disable-next-line no-control-regex
  const stripped = raw.replace(/[\x00-\x1F\x7F]/g, '').trim()

  if (stripped.length === 0) return { ok: false, error: 'Parameter must not be empty' }
  if (stripped.length > maxLength) {
    return { ok: false, error: `Parameter must be ${maxLength} characters or fewer` }
  }
  return { ok: true, value: stripped }
}

/**
 * Read a JSON body with a hard size cap, so an oversized payload is rejected
 * before it is parsed into memory.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES
): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  const declared = request.headers.get('content-length')
  if (declared && Number(declared) > maxBytes) {
    return { ok: false, error: 'Request body too large' }
  }

  const text = await request.text().catch(() => null)
  if (text === null) return { ok: false, error: 'Could not read request body' }
  if (text.length > maxBytes) return { ok: false, error: 'Request body too large' }

  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false, error: 'Invalid JSON body' }
  }
}
