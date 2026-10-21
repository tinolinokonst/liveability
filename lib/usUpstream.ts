// Shared plumbing for the server-side US lookups (lib/us*Source(s).ts).
//
// Same rules as the Swiss risk lookups: every result is cached per rounded
// coordinate with unstable_cache, and anything that should be retried rather
// than cached (timeout, 5xx, a spent quota) throws UsLookupError — a thrown
// result is never stored, so the next request tries again.

import { countryFromCoords } from './country'

const DEFAULT_TIMEOUT_MS = 10000

/** NWS requires an identifying User-Agent; the other services get the same one */
export const USER_AGENT = 'Liveability (contact@liveability.live)'

export class UsLookupError extends Error {}

export async function fetchUpstream(
  url: string,
  opts: { timeoutMs?: number; headers?: Record<string, string>; method?: 'GET' | 'POST'; body?: string } = {}
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    // no-store: caching happens once, on the parsed result
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      body: opts.body,
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': USER_AGENT, ...opts.headers },
    })
    if (!res.ok) throw new UsLookupError(`upstream ${res.status}`)
    return res
  } catch (err) {
    if (err instanceof UsLookupError) throw err
    throw new UsLookupError(err instanceof Error ? err.message : 'fetch failed')
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchJson<T>(url: string, opts?: Parameters<typeof fetchUpstream>[1]): Promise<T> {
  const res = await fetchUpstream(url, opts)
  try {
    return (await res.json()) as T
  } catch {
    throw new UsLookupError('invalid JSON')
  }
}

/**
 * Runs a lookup and turns a retryable failure into a value, after the cache:
 * the failure itself was never stored, so it costs nothing to retry later.
 */
export async function orError<T>(lookup: () => Promise<T>, onError: T, label: string): Promise<T> {
  try {
    return await lookup()
  } catch (err) {
    console.error(`[${label}]`, err instanceof Error ? err.message : err)
    return onError
  }
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Rounds a coordinate for cache keys; 4 decimals ≈ 11 m */
export function roundCoord(v: number, decimals = 4): number {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

export type UsRegion = 'conus' | 'alaska' | 'hawaii'

/** Which national dataset extent a US coordinate falls in (several datasets ship per region) */
export function usRegion(lat: number, lng: number): UsRegion {
  if (lat >= 51) return 'alaska'
  if (lat < 23 && lng < -150) return 'hawaii'
  return 'conus'
}

export function parseUsCoords(latRaw: string | null, lngRaw: string | null): { lat: number; lng: number } | null {
  if (!latRaw || !lngRaw) return null
  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return countryFromCoords(lat, lng) === 'US' ? { lat, lng } : null
}
