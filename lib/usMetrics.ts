// Client side of the US environment and risk metrics: fetching from the
// /api/us/* routes, and the wording the cards use. Server lookups live in
// lib/us*Source(s).ts. A failed request becomes an 'error' result, never a value.

import type {
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
  wildfire: { status: 'error', burnProbability: null, nriRating: null },
  epa: { status: 'error', radiusMiles: 1, sites: [], counts: { superfund_npl: 0, superfund: 0, tri: 0, brownfield: 0 } },
}

export const fetchUsAirQuality = (lat: number, lng: number) => getJson('airquality', lat, lng, AIR_ERROR)
export const fetchUsWeather = (lat: number, lng: number) => getJson('weather', lat, lng, WEATHER_ERROR(lat, lng))
export const fetchUsNoise = (lat: number, lng: number) => getJson('noise', lat, lng, NOISE_ERROR)
export const fetchUsSunlight = (lat: number, lng: number) => getJson('sunlight', lat, lng, SUN_ERROR)
export const fetchUsRisks = (lat: number, lng: number) => getJson('risks', lat, lng, US_RISKS_ERROR)

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

/** "0.0012" → "0.12 % a year (about 1 in 830)" */
export function formatBurnProbability(bp: number): string {
  if (bp <= 0) return 'Effectively zero'
  const pct = bp * 100
  const pctText = pct >= 1 ? pct.toFixed(1) : pct >= 0.01 ? pct.toFixed(2) : '<0.01'
  const oneIn = Math.round(1 / bp)
  const oneInText = oneIn >= 10000 ? '>10,000' : oneIn.toLocaleString('en-US', { maximumSignificantDigits: 2 })
  return `${pctText} % a year (about 1 in ${oneInText})`
}

export const US_RISK_NOTE = 'Informational only — check the official FEMA flood map and local records before signing a lease or buying.'
