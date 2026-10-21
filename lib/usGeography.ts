// Census units for a US coordinate, for the server-side lookups that key off
// them (CDC PLACES and SVI by tract, FCC broadband by county and urban/rural).
// From the Census Geocoder (no key), current vintage, cached 30 days per
// ~11 m: geographies don't move. Throws when the geocoder can't answer.

import { unstable_cache } from 'next/cache'
import { fetchJson, roundCoord, UsLookupError } from './usUpstream'

const URL_BASE = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates'

export interface CensusUnits {
  /** 5 digits */
  countyGeoid: string
  countyName: string
  /** 11 digits */
  tractGeoid: string
  /** 12 digits */
  blockGroupGeoid: string | null
  /** Inside a Census Urban Area */
  urban: boolean
}

interface Unit { GEOID?: string; NAME?: string }

async function lookupUnits(lat: number, lng: number): Promise<CensusUnits> {
  const params = new URLSearchParams({
    x: String(lng),
    y: String(lat),
    benchmark: 'Public_AR_Current',
    vintage: 'Current_Current',
    layers: 'Counties,Census Tracts,Census Block Groups,Urban Areas',
    format: 'json',
  })
  const data = await fetchJson<{ result?: { geographies?: Record<string, Unit[]> } }>(`${URL_BASE}?${params}`, { timeoutMs: 15000 })
  const g = data.result?.geographies
  const county = g?.Counties?.[0]
  const tract = g?.['Census Tracts']?.[0]
  if (!g || !county?.GEOID || !tract?.GEOID) throw new UsLookupError('Census Geocoder: no county/tract here')
  return {
    countyGeoid: county.GEOID,
    countyName: county.NAME ?? '',
    tractGeoid: tract.GEOID,
    blockGroupGeoid: g['Census Block Groups']?.[0]?.GEOID ?? null,
    urban: (g['Urban Areas']?.length ?? 0) > 0,
  }
}

const cachedUnits = unstable_cache(lookupUnits, ['us-census-units-v1'], { revalidate: 30 * 24 * 60 * 60 })

export function censusUnits(lat: number, lng: number): Promise<CensusUnits> {
  return cachedUnits(roundCoord(lat), roundCoord(lng))
}
