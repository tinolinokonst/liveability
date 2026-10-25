// US air quality: AirNow for the current reading, EPA AQS for annual context.
//
// AirNow retired its lat/long observation service on 2026-10-01; the
// replacement (/aq/observation/current/ziplatlong/) returns the closest
// monitor separately for each pollutant, in lowerCamelCase, and answers "no
// data in range" with a 200 and a WebServiceError envelope instead of [].
// AirNow data is preliminary and unvalidated — the card says so.
//
// AQS holds the validated archive. It is slow (seconds per request) and asks
// clients to stay under 10 requests a minute, so it's queried once per
// 0.5° grid cell for every monitor in a box around it, the parsed summary
// is cached for 30 days, and all requests draw from one shared budget.

import { unstable_cache } from 'next/cache'
import { consumeSharedQuota } from './apiGuard'
import { categoryFor, scoreForAqi } from './aqiScale'
import { fetchJson, haversineKm, orError, roundCoord, UsLookupError } from './usUpstream'
import type { UsAirQualityResult, UsAirReading, UsAnnualAir, UsAnnualPollutant } from './types'

const AIRNOW_URL = 'https://www.airnowapi.org/aq/observation/current/ziplatlong/'
const AQS_URL = 'https://aqs.epa.gov/data/api/annualData/byBox'
const AIRNOW_CACHE_SECONDS = 30 * 60
const AQS_CACHE_SECONDS = 30 * 24 * 60 * 60
const AQS_CELL_DEG = 0.5
const AQS_BOX_HALF_DEG = 0.75
/** Annual values only from monitors this close; farther ones describe a different place */
const ANNUAL_MAX_KM = 40

// NAAQS levels the annual statistics are compared against
const STANDARDS = {
  pm25: { level: 9.0, unit: 'µg/m³', aqsStandard: 'PM25 Annual 2024', field: 'arithmetic_mean' },
  ozone: { level: 0.070, unit: 'ppm', aqsStandard: 'Ozone 8-hour 2015', field: 'fourth_max_value' },
  no2: { level: 53, unit: 'ppb', aqsStandard: 'NO2 Annual 1971', field: 'arithmetic_mean' },
} as const
type Pollutant = keyof typeof STANDARDS

const AQS_PARAMS: Record<string, Pollutant> = { '88101': 'pm25', '44201': 'ozone', '42602': 'no2' }

// ─── AirNow ──────────────────────────────────────────────────────────────────

interface AirNowRow {
  dateObserved: string
  hourObserved: string
  localTimeZone: string
  reportingAreaName: string
  // Either can be null in the replacement service's output
  siteID: string | null
  siteName: string | null
  parameterName: string
  nowcastAQI: number
  aqiCategoryName?: string
}

interface AirNowSnapshot {
  rows: Array<Pick<AirNowRow, 'siteID' | 'siteName' | 'parameterName' | 'nowcastAQI' | 'reportingAreaName'>>
  observedAt: string | null
  reportingArea: string | null
}

async function lookupAirNow(lat: number, lng: number): Promise<AirNowSnapshot> {
  const key = process.env.AIRNOW_API_KEY
  if (!key) throw new UsLookupError('AIRNOW_API_KEY is not configured')
  // AirNow allows 500 requests an hour per key
  if (!(await consumeSharedQuota('airnow', 450, 3600))) throw new UsLookupError('AirNow budget spent')

  const params = new URLSearchParams({ format: 'application/json', latitude: String(lat), longitude: String(lng), distance: '50', API_KEY: key })
  const data = await fetchJson<AirNowRow[] | { WebServiceError?: Array<{ Message: string }> }>(`${AIRNOW_URL}?${params}`)
  if (!Array.isArray(data)) {
    const message = data?.WebServiceError?.[0]?.Message ?? ''
    // "No data" is an answer; anything else (a retired or broken endpoint) is a failure
    if (/no data|not found/i.test(message)) return { rows: [], observedAt: null, reportingArea: null }
    throw new UsLookupError(`AirNow error: ${message || 'unexpected response'}`)
  }
  const rows = data.filter(r => typeof r.nowcastAQI === 'number' && r.nowcastAQI >= 0)
  const first = rows[0]
  return {
    rows: rows.map(r => ({ siteID: r.siteID, siteName: r.siteName, parameterName: r.parameterName, nowcastAQI: r.nowcastAQI, reportingAreaName: r.reportingAreaName })),
    observedAt: first ? `${first.dateObserved} ${first.hourObserved} ${first.localTimeZone}` : null,
    reportingArea: first?.reportingAreaName ?? null,
  }
}

// ~2 km cells: AirNow answers with the closest monitor per pollutant, which
// doesn't change across a few hundred metres
const cachedAirNow = unstable_cache(lookupAirNow, ['us-airnow-v2'], { revalidate: AIRNOW_CACHE_SECONDS })

// ─── AQS ─────────────────────────────────────────────────────────────────────

interface AqsSite {
  /** state(2) + county(3) + site(4): the same digits AirNow site IDs end in */
  id: string
  name: string
  lat: number
  lng: number
  values: Partial<Record<Pollutant, number>>
}

interface AqsCell {
  year: number | null
  sites: AqsSite[]
}

interface AqsRow {
  state_code: string
  county_code: string
  site_number: string
  local_site_name: string | null
  latitude: number
  longitude: number
  parameter_code: string
  pollutant_standard: string | null
  event_type: string
  validity_indicator: string
  arithmetic_mean: number | null
  fourth_max_value: number | null
}

async function fetchAqsYear(cellLat: number, cellLng: number, year: number): Promise<AqsRow[]> {
  const email = process.env.AQS_EMAIL
  const key = process.env.AQS_API_KEY
  if (!email || !key) throw new UsLookupError('AQS credentials are not configured')
  if (!(await consumeSharedQuota('aqs', 8, 60))) throw new UsLookupError('AQS budget spent')

  const params = new URLSearchParams({
    email,
    key,
    param: Object.keys(AQS_PARAMS).join(','),
    bdate: `${year}0101`,
    edate: `${year}1231`,
    minlat: String(cellLat - AQS_BOX_HALF_DEG),
    maxlat: String(cellLat + AQS_BOX_HALF_DEG),
    minlon: String(cellLng - AQS_BOX_HALF_DEG),
    maxlon: String(cellLng + AQS_BOX_HALF_DEG),
  })
  // The response header echoes the request URL, credentials included: never log it
  const data = await fetchJson<{ Header?: Array<{ status: string }>; Data?: AqsRow[] }>(`${AQS_URL}?${params}`, { timeoutMs: 45000 })
  const status = data.Header?.[0]?.status ?? ''
  if (status === 'No data matched your selection') return []
  if (status !== 'Success') throw new UsLookupError(`AQS status: ${status || 'unknown'}`)
  return data.Data ?? []
}

function summariseAqs(rows: AqsRow[]): AqsSite[] {
  const sites = new Map<string, AqsSite>()
  for (const r of rows) {
    const pollutant = AQS_PARAMS[r.parameter_code]
    if (!pollutant) continue
    const std = STANDARDS[pollutant]
    // The statistic for the current standard, from a complete year, with
    // exceptional events (wildfire smoke etc.) excluded where EPA flagged them
    if (r.pollutant_standard !== std.aqsStandard) continue
    if (r.validity_indicator !== 'Y') continue
    if (r.event_type !== 'No Events' && r.event_type !== 'Events Excluded') continue
    const value = r[std.field]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue

    const id = `${r.state_code}${r.county_code}${r.site_number}`
    const site = sites.get(id) ?? { id, name: r.local_site_name?.trim() || `AQS site ${id}`, lat: r.latitude, lng: r.longitude, values: {} }
    // Several instruments (POCs) at one site: report the highest, not a blend
    site.values[pollutant] = Math.max(site.values[pollutant] ?? -Infinity, value)
    sites.set(id, site)
  }
  return [...sites.values()]
}

async function lookupAqsCell(cellLat: number, cellLng: number): Promise<AqsCell> {
  // The most recent year AQS has data for: last year once it's loaded, else the one before
  const thisYear = new Date().getUTCFullYear()
  for (const year of [thisYear - 1, thisYear - 2]) {
    const sites = summariseAqs(await fetchAqsYear(cellLat, cellLng, year))
    if (sites.length) return { year, sites }
  }
  return { year: null, sites: [] }
}

const cachedAqsCell = unstable_cache(lookupAqsCell, ['us-aqs-cell-v1'], { revalidate: AQS_CACHE_SECONDS })

function aqsCellFor(lat: number, lng: number): [number, number] {
  const snap = (v: number) => Math.round(v / AQS_CELL_DEG) * AQS_CELL_DEG
  return [snap(lat), snap(lng)]
}

function annualFrom(cell: AqsCell, lat: number, lng: number): UsAnnualAir {
  const pollutants: UsAnnualPollutant[] = []
  for (const pollutant of Object.keys(STANDARDS) as Pollutant[]) {
    let best: { site: AqsSite; km: number } | null = null
    for (const site of cell.sites) {
      if (site.values[pollutant] === undefined) continue
      const km = haversineKm(lat, lng, site.lat, site.lng)
      if (km <= ANNUAL_MAX_KM && (!best || km < best.km)) best = { site, km }
    }
    if (!best) continue
    const std = STANDARDS[pollutant]
    pollutants.push({
      pollutant,
      value: best.site.values[pollutant]!,
      unit: std.unit,
      standard: std.level,
      siteName: best.site.name,
      distanceKm: Math.round(best.km * 1000) / 1000,
      lat: best.site.lat,
      lng: best.site.lng,
    })
  }
  return { status: pollutants.length ? 'ok' : 'no_data', year: cell.year, pollutants }
}

// ─── combined ────────────────────────────────────────────────────────────────

const POLLUTANT_LABEL: Record<string, string> = { 'PM2.5': 'PM2.5', PM10: 'PM10', OZONE: 'Ozone', O3: 'Ozone' }

export async function getUsAirQuality(lat: number, lng: number): Promise<UsAirQualityResult> {
  const [cellLat, cellLng] = aqsCellFor(lat, lng)
  const [airnow, cell] = await Promise.all([
    orError(() => cachedAirNow(roundCoord(lat, 2), roundCoord(lng, 2)), null, 'us-airnow'),
    orError(() => cachedAqsCell(cellLat, cellLng), null, 'us-aqs'),
  ])

  const annual: UsAnnualAir = cell ? annualFrom(cell, lat, lng) : { status: 'error', year: null, pollutants: [] }

  if (!airnow) {
    return { status: 'error', aqi: null, category: null, score: null, observedAt: null, reportingArea: null, readings: [], annual, message: 'Current readings are temporarily unavailable.' }
  }

  const sitesById = new Map((cell?.sites ?? []).map(s => [s.id, s]))
  const readings: UsAirReading[] = airnow.rows.map(r => {
    // AirNow IDs are 9 digits (state/county/site), sometimes behind a 3-digit country code
    const site = r.siteID ? sitesById.get(r.siteID.slice(-9)) : undefined
    return {
      pollutant: POLLUTANT_LABEL[r.parameterName] ?? r.parameterName,
      aqi: r.nowcastAQI,
      category: categoryFor(r.nowcastAQI),
      siteName: r.siteName?.trim() || r.reportingAreaName || 'Unnamed monitor',
      distanceKm: site ? Math.round(haversineKm(lat, lng, site.lat, site.lng) * 1000) / 1000 : null,
      ...(site && { lat: site.lat, lng: site.lng }),
    }
  })

  if (!readings.length) {
    return { status: 'no_data', aqi: null, category: null, score: null, observedAt: null, reportingArea: null, readings, annual, message: 'No AirNow monitor reports within 50 miles of this address.' }
  }

  // The AQI of a place is the highest of its pollutants' AQIs
  const aqi = Math.max(...readings.map(r => r.aqi))
  return {
    status: 'ok',
    aqi,
    category: categoryFor(aqi),
    score: scoreForAqi(aqi),
    observedAt: airnow.observedAt,
    reportingArea: airnow.reportingArea,
    readings,
    annual,
  }
}
