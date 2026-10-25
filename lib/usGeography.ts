// Census units for a US coordinate, for the server-side lookups that key off
// them (CDC PLACES and SVI by tract, FCC broadband by county and urban/rural).
// From the Census Geocoder (no key), current vintage, cached 30 days per
// ~11 m: geographies don't move. Throws when the geocoder can't answer.

import { unstable_cache } from 'next/cache'
import { fetchJson, roundCoord, UsLookupError } from './usUpstream'

const URL_BASE = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates'

export interface CensusUnits {
  /** e.g. "AZ" */
  stateAbbr: string
  stateName: string
  /** 5 digits */
  countyGeoid: string
  countyName: string
  /** 11 digits */
  tractGeoid: string
  /** 12 digits */
  blockGroupGeoid: string | null
  /** Inside a Census Urban Area */
  urban: boolean
  /** Tract land area, m² (for population density) */
  tractLandM2: number | null
  /** Incorporated place (city, town, village), if the point is inside one */
  place: { geoid: string; name: string } | null
}

interface Unit { GEOID?: string; NAME?: string; AREALAND?: number | string; STUSAB?: string }

async function lookupUnits(lat: number, lng: number): Promise<CensusUnits> {
  const params = new URLSearchParams({
    x: String(lng),
    y: String(lat),
    benchmark: 'Public_AR_Current',
    vintage: 'Current_Current',
    layers: 'States,Counties,Census Tracts,Census Block Groups,Urban Areas,Incorporated Places',
    format: 'json',
  })
  const data = await fetchJson<{ result?: { geographies?: Record<string, Unit[]> } }>(`${URL_BASE}?${params}`, { timeoutMs: 15000 })
  const g = data.result?.geographies
  const county = g?.Counties?.[0]
  const tract = g?.['Census Tracts']?.[0]
  const state = g?.States?.[0]
  if (!g || !state?.STUSAB || !county?.GEOID || !tract?.GEOID) throw new UsLookupError('Census Geocoder: no state/county/tract here')
  return {
    stateAbbr: state.STUSAB,
    stateName: state.NAME ?? state.STUSAB,
    countyGeoid: county.GEOID,
    countyName: county.NAME ?? '',
    tractGeoid: tract.GEOID,
    blockGroupGeoid: g['Census Block Groups']?.[0]?.GEOID ?? null,
    urban: (g['Urban Areas']?.length ?? 0) > 0,
    tractLandM2: Number(tract.AREALAND) > 0 ? Number(tract.AREALAND) : null,
    place: g['Incorporated Places']?.[0]?.GEOID ? { geoid: g['Incorporated Places'][0].GEOID!, name: g['Incorporated Places'][0].NAME ?? '' } : null,
  }
}

const cachedUnits = unstable_cache(lookupUnits, ['us-census-units-v3'], { revalidate: 30 * 24 * 60 * 60 })

export function censusUnits(lat: number, lng: number): Promise<CensusUnits> {
  return cachedUnits(roundCoord(lat), roundCoord(lng))
}

// The 2010 census tract, for datasets still on 2010 boundaries (the
// Opportunity Atlas). Tracts were split and redrawn in 2020, so the 2020
// GEOID can't be used to look them up.
async function lookupTract2010(lat: number, lng: number): Promise<string | null> {
  const params = new URLSearchParams({
    x: String(lng),
    y: String(lat),
    benchmark: 'Public_AR_Current',
    vintage: 'Census2010_Current',
    layers: 'Census Tracts',
    format: 'json',
  })
  const data = await fetchJson<{ result?: { geographies?: Record<string, Unit[]> } }>(`${URL_BASE}?${params}`, { timeoutMs: 15000 })
  if (!data.result?.geographies) throw new UsLookupError('Census Geocoder: unexpected response')
  return data.result.geographies['Census Tracts']?.[0]?.GEOID ?? null
}

const cachedTract2010 = unstable_cache(lookupTract2010, ['us-census-tract2010-v1'], { revalidate: 30 * 24 * 60 * 60 })

export function censusTract2010(lat: number, lng: number): Promise<string | null> {
  return cachedTract2010(roundCoord(lat), roundCoord(lng))
}
