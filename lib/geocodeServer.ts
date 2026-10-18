// Server-only.
import { usEnabled } from './flags'
import type { CountryCode } from './country'
import type { UsGeography } from './types'

// Address → coordinates via Google, Switzerland first.
//
// Google's Geocoding API accepts only one country filter, and when nothing
// matches it doesn't say so: it returns the filtered country itself as a
// partial match (a US address searched with country:CH comes back as
// "Switzerland"). So: the Swiss request runs exactly as it always has, and its
// answer is used whenever it found a real place. Only when it fell back to the
// whole country do we try the US (if US_ENABLED) — and if neither found a real
// place, the address is not found, rather than "the middle of Switzerland".
//
// US results also get their Census geographies (state, county, tract FIPS)
// from the Census Geocoder — no key — which every US data provider keys off.

interface GoogleResult {
  formatted_address?: string
  types?: string[]
  geometry?: { location?: { lat?: number; lng?: number } }
  address_components?: Array<{ short_name?: string; types?: string[] }>
}

const CENSUS_GEOGRAPHIES = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates'
const TIMEOUT_MS = 10000

export class UpstreamError extends Error {}

async function google(address: string, country: CountryCode, key: string): Promise<{ status: string; results: GoogleResult[] }> {
  // The CH request is unchanged from the Swiss-only version (region + component filter)
  const filter = country === 'CH' ? '&region=ch&components=country:CH' : '&region=us&components=country:US'
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}${filter}&key=${key}`)
  if (!res.ok) {
    console.error(`[geocoding] upstream HTTP ${res.status}`)
    throw new UpstreamError()
  }
  const data = await res.json()
  // Google's raw payload can carry an `error_message` naming the API key /
  // project, so it is logged, never echoed
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS' && data.error_message) {
    console.error(`[geocoding] upstream: ${data.status}: ${data.error_message}`)
  }
  return { status: data.status, results: Array.isArray(data.results) ? data.results : [] }
}

/** True when Google matched nothing but the country filter itself */
function isCountryFallback(r: GoogleResult | undefined): boolean {
  return !r || (r.types ?? []).includes('country')
}

function countryOfResult(r: GoogleResult): string | null {
  return r.address_components?.find(c => c.types?.includes('country'))?.short_name ?? null
}

async function censusGeography(lat: number, lng: number): Promise<UsGeography | null> {
  const params = new URLSearchParams({
    x: String(lng),
    y: String(lat),
    benchmark: 'Public_AR_Current',
    vintage: 'Current_Current',
    layers: 'States,Counties,Census Tracts',
    format: 'json',
  })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    // Geographies don't move; cache per coordinate for 30 days
    const res = await fetch(`${CENSUS_GEOGRAPHIES}?${params}`, { signal: controller.signal, next: { revalidate: 2592000 } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const g = (await res.json())?.result?.geographies
    const state = g?.States?.[0]
    const county = g?.Counties?.[0]
    const tract = g?.['Census Tracts']?.[0]
    if (!state || !county || !tract) return null
    return {
      stateFips: String(state.STATE),
      stateAbbr: String(state.STUSAB ?? ''),
      stateName: String(state.NAME ?? ''),
      countyFips: String(county.COUNTY),
      countyName: String(county.NAME ?? ''),
      tractFips: String(tract.TRACT),
      tractName: String(tract.NAME ?? ''),
      tractGeoid: String(tract.GEOID),
    }
  } catch (err) {
    console.error('[geocoding] Census Geocoder failed:', err instanceof Error ? err.message : err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function shape(r: GoogleResult, country: CountryCode) {
  return {
    formatted_address: r.formatted_address ?? null,
    geometry: { location: { lat: r.geometry?.location?.lat ?? null, lng: r.geometry?.location?.lng ?? null } },
    country,
  }
}

export interface ResolvedAddress {
  status: 'OK' | 'ZERO_RESULTS' | 'ERROR'
  results: Array<ReturnType<typeof shape> & { us?: UsGeography | null }>
}

/** Throws UpstreamError (or a network error) when Google can't be reached */
export async function resolveAddress(address: string, key: string): Promise<ResolvedAddress> {
  // 1. Switzerland — the same request as ever
  const ch = await google(address, 'CH', key)
  if (ch.status === 'OK' && !isCountryFallback(ch.results[0])) {
    return { status: 'OK', results: ch.results.slice(0, 5).map(r => shape(r, 'CH')) }
  }
  if (ch.status !== 'OK' && ch.status !== 'ZERO_RESULTS') return { status: 'ERROR', results: [] }

  // 2. United States, only when US coverage is switched on
  if (usEnabled()) {
    const us = await google(address, 'US', key)
    const top = us.results[0]
    if (us.status === 'OK' && !isCountryFallback(top) && countryOfResult(top) === 'US') {
      const lat = top.geometry?.location?.lat
      const lng = top.geometry?.location?.lng
      const geography = typeof lat === 'number' && typeof lng === 'number' ? await censusGeography(lat, lng) : null
      return { status: 'OK', results: [{ ...shape(top, 'US'), us: geography }] }
    }
  }

  // Neither found a real place (only the country-level fallback): not found
  return { status: 'ZERO_RESULTS', results: [] }
}
