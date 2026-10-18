// US sunlight from the National Laboratory of the Rockies (NLR, formerly
// NREL) Solar Resource API: long-term average irradiance from the National
// Solar Radiation Database, for the ~4 km cell the address is in — an area
// value, not this building's roof (the card says so).
//
// The key is DATA_GOV_API_KEY (an api.data.gov key works across NLR's APIs).
// NLR allows 1,000 requests an hour per key; the data are long-term means, so
// results are cached 30 days per ~1 km.

import { unstable_cache } from 'next/cache'
import { consumeSharedQuota } from './apiGuard'
import { fetchJson, orError, roundCoord, UsLookupError } from './usUpstream'
import type { UsSunlightResult } from './types'

const URL_BASE = 'https://developer.nlr.gov/api/solar/solar_resource/v1.json'
const CACHE_SECONDS = 30 * 24 * 60 * 60
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

// US range of annual global horizontal irradiance, kWh/m²/day, for the score.
// Sampled from this API on 2026-10-18: Seattle 3.46, Portland 3.53, Buffalo
// 3.68, Boston 3.84, Chicago 3.89, New York 3.93, Atlanta 4.50, Denver 4.83,
// Miami 5.17, Los Angeles 5.30, Honolulu 5.67, Las Vegas 5.68, Phoenix 5.78,
// Yuma 5.86. The Swiss scale (rooftop sunshine hours) doesn't transfer; these
// bounds spread the real national range across the bar, so cloudy Seattle
// reads near the bottom and the desert Southwest near the top.
const MIN_GHI = 3.3
const MAX_GHI = 5.8

export function scoreForGhi(ghi: number): number {
  return Math.round(Math.max(0, Math.min(100, ((ghi - MIN_GHI) / (MAX_GHI - MIN_GHI)) * 100)))
}

interface Series { annual: number; monthly: Record<string, number> }

interface SolarCell { ghi: number | null; latTilt: number | null; monthlyGhi: number[] | null }

async function lookupSolar(lat: number, lng: number): Promise<SolarCell> {
  const key = process.env.DATA_GOV_API_KEY
  if (!key) throw new UsLookupError('DATA_GOV_API_KEY is not configured')
  if (!(await consumeSharedQuota('nlr', 900, 3600))) throw new UsLookupError('NLR budget spent')

  const params = new URLSearchParams({ api_key: key, lat: String(lat), lon: String(lng) })
  const data = await fetchJson<{ errors?: string[]; outputs?: { avg_ghi?: Series | string; avg_lat_tilt?: Series | string } }>(`${URL_BASE}?${params}`)
  if (data.errors?.length) throw new UsLookupError(`NLR: ${data.errors[0]}`)
  const o = data.outputs
  if (!o) throw new UsLookupError('NLR: unexpected response')
  // Outside the database (most of Alaska) the fields are the string "no data"
  const ghi = typeof o.avg_ghi === 'object' ? o.avg_ghi : null
  const tilt = typeof o.avg_lat_tilt === 'object' ? o.avg_lat_tilt : null
  return {
    ghi: ghi?.annual ?? null,
    latTilt: tilt?.annual ?? null,
    monthlyGhi: ghi ? MONTHS.map(m => ghi.monthly[m]) : null,
  }
}

const cachedSolar = unstable_cache(lookupSolar, ['us-nlr-solar-v1'], { revalidate: CACHE_SECONDS })

export async function getUsSunlight(lat: number, lng: number): Promise<UsSunlightResult> {
  const cell = await orError(() => cachedSolar(roundCoord(lat, 2), roundCoord(lng, 2)), null, 'us-solar')
  if (!cell) return { status: 'error', ghi: null, latTilt: null, monthlyGhi: null, score: null, message: 'Solar data is temporarily unavailable.' }
  if (cell.ghi === null) return { status: 'no_data', ...cell, score: null, message: 'The solar database has no data for this location.' }
  return { status: 'ok', ...cell, score: scoreForGhi(cell.ghi) }
}
