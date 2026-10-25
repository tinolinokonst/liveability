// Client side of the US environment and risk metrics: fetching from the
// /api/us/* routes, and the wording the cards use. Server lookups live in
// lib/us*Source(s).ts. A failed request becomes an 'error' result, never a value.

import type {
  UsCommunityResult,
  UsRentResult,
  UsSafetyResult,
  UsBroadbandResult,
  UsFoodAccessResult,
  UsHealthResult,
  UsSchoolsResult,
  UsTransitResult,
  UsWalkabilityResult,
  EpaSiteKind,
  FloodRisk,
  HeatRiskLevel,
  NoiseBand,
  NriRating,
  UsAirQualityResult,
  UsNoiseResult,
  UsRisksResult,
  UsSunlightResult,
  UsWeatherResult,
} from './types'

async function getJson<T>(path: string, lat: number, lng: number, fallback: T): Promise<T> {
  try {
    const res = await fetch(`/api/us/${path}?lat=${lat}&lng=${lng}`)
    if (!res.ok) return fallback
    return (await res.json()) as T
  } catch {
    return fallback
  }
}

const AIR_ERROR: UsAirQualityResult = {
  status: 'error', aqi: null, category: null, score: null, observedAt: null, reportingArea: null, readings: [],
  annual: { status: 'error', year: null, pollutants: [] },
}
const WEATHER_ERROR = (lat: number, lng: number): UsWeatherResult => ({
  alertsStatus: 'error', alerts: [], heatStatus: 'error', heatRiskMax: null, heatRiskToday: null, maxTempF: null,
  forecastUrl: `https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lng}`,
})
const NOISE_ERROR: UsNoiseResult = { status: 'error', band: null, score: null, modes: { road: null, rail: null, aviation: null } }
const SUN_ERROR: UsSunlightResult = { status: 'error', ghi: null, latTilt: null, monthlyGhi: null, score: null }
export const US_RISKS_ERROR: UsRisksResult = {
  flood: { status: 'error', zone: null, subtype: null, risk: null, sfha: null, bfeFt: null, firmPanel: null, effectiveDate: null },
  nri: { status: 'error', tract: null, county: null, version: null },
  wildfire: { status: 'error', tract: null, county: null },
  epa: { status: 'error', radiusMiles: 1, sites: [], counts: { superfund_npl: 0, superfund: 0, tri: 0, brownfield: 0 } },
}

export const fetchUsAirQuality = (lat: number, lng: number) => getJson('airquality', lat, lng, AIR_ERROR)
export const fetchUsWeather = (lat: number, lng: number) => getJson('weather', lat, lng, WEATHER_ERROR(lat, lng))
export const fetchUsNoise = (lat: number, lng: number) => getJson('noise', lat, lng, NOISE_ERROR)
export const fetchUsSunlight = (lat: number, lng: number) => getJson('sunlight', lat, lng, SUN_ERROR)
export const fetchUsRisks = (lat: number, lng: number) => getJson('risks', lat, lng, US_RISKS_ERROR)

// Getting around and daily life
const WALK_ERROR: UsWalkabilityResult = { status: 'error', index: null, score: null, ranks: null, blockGroup: null }
const TRANSIT_ERROR: UsTransitResult = { status: 'error', stops: null, stationCount: 0, score: null, feedsStatus: 'error', feeds: [] }
const SCHOOLS_ERROR: UsSchoolsResult = { status: 'error', schools: null, publicYear: null, privateYear: null }
const FOOD_ERROR: UsFoodAccessResult = { groceryStatus: 'error', grocery: null, usdaStatus: 'error', usda: null }
const BROADBAND_ERROR: UsBroadbandResult = { status: 'error', county: null, area: null, figures: null, asOf: null }
const HEALTH_ERROR: UsHealthResult = { placesStatus: 'error', measures: [], placesYear: null, sviStatus: 'error', svi: null, tract: null }

export const fetchUsWalkability = (lat: number, lng: number) => getJson('walkability', lat, lng, WALK_ERROR)
export const fetchUsTransit = (lat: number, lng: number) => getJson('transit', lat, lng, TRANSIT_ERROR)
export const fetchUsSchools = (lat: number, lng: number) => getJson('schools', lat, lng, SCHOOLS_ERROR)
export const fetchUsFoodAccess = (lat: number, lng: number) => getJson('food', lat, lng, FOOD_ERROR)
export const fetchUsBroadband = (lat: number, lng: number) => getJson('broadband', lat, lng, BROADBAND_ERROR)
export const fetchUsHealth = (lat: number, lng: number) => getJson('health', lat, lng, HEALTH_ERROR)

// Community, safety, rent
const COMMUNITY_ERROR: UsCommunityResult = {
  status: 'error', acsPeriod: null, tract: null, county: null, us: null, densityPerSqMi: null, tractName: null, countyName: null, mobilityStatus: 'error', mobility: null,
}
const SAFETY_ERROR: UsSafetyResult = { status: 'error', agency: null, matchedBy: null, year: null, rates: null, stateRates: null, usRates: null, stateName: null, score: null }
const RENT_ERROR: UsRentResult = { status: 'error', byBedrooms: null, level: null, zip: null, areaName: null, fiscalYear: 'FY2026' }

export const fetchUsCommunity = (lat: number, lng: number) => getJson('community', lat, lng, COMMUNITY_ERROR)
export const fetchUsSafety = (lat: number, lng: number) => getJson('safety', lat, lng, SAFETY_ERROR)
export const fetchUsRent = (lat: number, lng: number) => getJson('rent', lat, lng, RENT_ERROR)

export const usd = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`

export const HUD_RENT_LABEL = 'HUD Fair Market Rent — a market estimate, not a listing price'
export const SAFETY_LEVEL_LABEL = 'City/agency level, not address level'

// ─── wording ─────────────────────────────────────────────────────────────────

export const UNAVAILABLE = 'Temporarily unavailable'
export const MUTED = '#a0a0a0'

export const POLLUTANT_LABEL: Record<'pm25' | 'ozone' | 'no2', { name: string; stat: string }> = {
  pm25: { name: 'PM2.5', stat: 'annual mean' },
  ozone: { name: 'Ozone', stat: '4th-highest daily 8-hour maximum' },
  no2: { name: 'NO₂', stat: 'annual mean' },
}

// NWS HeatRisk categories and colours (https://www.wpc.ncep.noaa.gov/heatrisk/)
export const HEAT_RISK_INFO: Record<HeatRiskLevel, { label: string; color: string; meaning: string }> = {
  0: { label: 'Little to none', color: '#22c55e', meaning: 'No elevated risk from heat' },
  1: { label: 'Minor', color: '#eab308', meaning: 'Primarily affects those extremely sensitive to heat' },
  2: { label: 'Moderate', color: '#f97316', meaning: 'Affects most people sensitive to heat, especially without cooling' },
  3: { label: 'Major', color: '#ef4444', meaning: 'Affects anyone without effective cooling or hydration' },
  4: { label: 'Extreme', color: '#d946ef', meaning: 'Rare, long-duration heat affecting anyone without cooling' },
}

export const NOISE_BAND_LABEL: Record<NoiseBand, string> = {
  below_45: 'Below 45 dBA',
  '45_50': '45–50 dBA',
  '50_55': '50–55 dBA',
  '55_60': '55–60 dBA',
  '60_70': '60–70 dBA',
  '70_80': '70–80 dBA',
  '80_90': '80–90 dBA',
  above_90: 'Above 90 dBA',
}

/** Same cut-offs as the card's Good/Fair/Poor badge, so the two never disagree */
export function noiseLevel(score: number): string {
  if (score >= 70) return 'Quiet'
  if (score >= 40) return 'Moderate'
  return 'Loud'
}

export const FLOOD_RISK_INFO: Record<FloodRisk, { label: string; color: string; meaning: string }> = {
  coastal_high: {
    label: 'High risk (coastal)',
    color: '#ef4444',
    meaning: 'Special Flood Hazard Area with storm-surge wave action: at least a 1% chance of flooding each year (26% over a 30-year mortgage). Flood insurance is required for federally backed mortgages.',
  },
  high: {
    label: 'High risk',
    color: '#ef4444',
    meaning: 'Special Flood Hazard Area: at least a 1% chance of flooding each year (26% over a 30-year mortgage). Flood insurance is required for federally backed mortgages.',
  },
  moderate: {
    label: 'Moderate risk',
    color: '#eab308',
    meaning: 'Between the 1% and 0.2% annual-chance floodplains, or protected by a levee. Insurance is not required but recommended.',
  },
  minimal: {
    label: 'Minimal risk',
    color: '#22c55e',
    meaning: 'Outside the 0.2%-annual-chance floodplain. Floods can still happen here — about a quarter of flood insurance claims come from outside high-risk zones.',
  },
  undetermined: {
    label: 'Undetermined',
    color: MUTED,
    meaning: 'Zone D: flood hazards are possible but have not been studied.',
  },
  water: { label: 'Open water', color: '#3b82f6', meaning: 'Mapped as open water.' },
}

export const NRI_RATING_COLOR: Record<NriRating, string> = {
  'Very High': '#ef4444',
  'Relatively High': '#f97316',
  'Relatively Moderate': '#eab308',
  'Relatively Low': '#3b82f6',
  'Very Low': '#22c55e',
  'No Rating': MUTED,
  'Not Applicable': MUTED,
  'Insufficient Data': MUTED,
}

export const EPA_KIND_INFO: Record<EpaSiteKind, { label: string; singular: string; plural: string; color: string; meaning: string }> = {
  superfund_npl: {
    label: 'Superfund site (National Priorities List)',
    singular: 'Superfund NPL site',
    plural: 'Superfund NPL sites',
    color: '#ef4444',
    meaning: "Among the nation's most serious known releases of hazardous substances, under long-term federal cleanup.",
  },
  superfund: {
    label: 'Superfund site (not on the NPL)',
    singular: 'other Superfund site',
    plural: 'other Superfund sites',
    color: '#f97316',
    meaning: 'Assessed or handled under the Superfund program without being listed; many were found to need no further federal action.',
  },
  brownfield: {
    label: 'Brownfield property',
    singular: 'brownfield property',
    plural: 'brownfield properties',
    color: '#eab308',
    meaning: 'A property whose reuse may be complicated by actual or suspected contamination, assessed or cleaned up with EPA brownfield funding.',
  },
  tri: {
    label: 'Toxics Release Inventory facility',
    singular: 'TRI facility',
    plural: 'TRI facilities',
    color: '#a855f7',
    meaning: 'An industrial facility that has reported releases of listed toxic chemicals. Being listed does not mean it is still operating or releasing.',
  },
}

/** What FEMA's non-ratings mean, in its own terms (NRI technical documentation) */
export const NRI_NON_RATING: Partial<Record<NriRating, string>> = {
  'No Rating': 'FEMA estimates no expected annual loss from this hazard here.',
  'Not Applicable': 'FEMA considers this hazard not applicable here.',
  'Insufficient Data': 'FEMA has too little data to rate this hazard here.',
}

// EPA's four National Walkability Index categories
export function walkCategory(index: number): { label: string; color: string } {
  if (index > 15.25) return { label: 'Most walkable', color: '#22c55e' }
  if (index > 10.5) return { label: 'Above average', color: '#84cc16' }
  if (index > 5.75) return { label: 'Below average', color: '#f59e0b' }
  return { label: 'Least walkable', color: '#ef4444' }
}

// CDC's SVI quartiles
export function sviBand(p: number): { label: string; color: string } {
  if (p >= 0.75) return { label: 'High vulnerability', color: '#ef4444' }
  if (p >= 0.5) return { label: 'Moderate-to-high vulnerability', color: '#f97316' }
  if (p >= 0.25) return { label: 'Low-to-moderate vulnerability', color: '#eab308' }
  return { label: 'Low vulnerability', color: '#22c55e' }
}

export const pct = (share: number) => `${Math.round(share * 100)} %`

export const US_RISK_NOTE = 'Informational only — check the official FEMA flood map and local records before signing a lease or buying.'
