// Server-side lookups for the US community, safety and rent cards:
//
// - Community: Census ACS 5-year estimates for the tract (median household
//   income, median gross rent, median age, population → density), with the
//   county and the US for context; and the Opportunity Atlas upward-mobility
//   outcome for the 2010 tract (prebuilt in lib/data/us-opportunity-atlas.json,
//   see scripts/build-us-opportunity.py).
// - Safety: FBI Crime Data Explorer, offenses per 100,000 for the police
//   agency that serves the address's city (or the county sheriff outside a
//   city). City/agency level — never presented as the address's own risk.
// - Rent: HUD Fair Market Rents from HUD's ArcGIS open-data hub: the Small
//   Area FMR for the address's ZIP code where HUD publishes one, else the
//   metro or county FMR.
//
// Same rules as the other US lookups (lib/usUpstream.ts): parsed results are
// cached, failures throw and are never cached, each part degrades on its own.

import { unstable_cache } from 'next/cache'
import { censusTract2010, censusUnits, type CensusUnits } from './usGeography'
import { fetchJson, orError, roundCoord, UsLookupError } from './usUpstream'
import type { AcsFigures, CrimeRates, UsCommunityResult, UsRentResult, UsSafetyResult } from './types'

const DAY = 24 * 60 * 60
const SQ_M_PER_SQ_MI = 2_589_988.11

interface ArcGisQuery<A> { features?: Array<{ attributes: A }>; error?: { message?: string } }

async function arcgis<A>(url: string, params: Record<string, string>): Promise<A[]> {
  const qs = new URLSearchParams({ returnGeometry: 'false', f: 'json', ...params })
  const data = await fetchJson<ArcGisQuery<A>>(`${url}/query?${qs}`, { timeoutMs: 15000 })
  if (data.error || !Array.isArray(data.features)) throw new UsLookupError(`ArcGIS: ${data.error?.message ?? 'unexpected response'}`)
  return data.features.map(f => f.attributes)
}

// ─── community: Census ACS ───────────────────────────────────────────────────

const ACS_VARS = { medianHouseholdIncome: 'B19013_001E', medianGrossRent: 'B25064_001E', medianAge: 'B01002_001E', population: 'B01003_001E' } as const
/** Newest 5-year release first; the next is tried when one isn't published */
const ACS_YEARS = [2025, 2024, 2023]

type Geo = { kind: 'tract'; state: string; county: string; tract: string } | { kind: 'county'; state: string; county: string } | { kind: 'us' }

function acsGeoParams(g: Geo): string {
  if (g.kind === 'us') return 'for=us:1'
  if (g.kind === 'county') return `for=county:${g.county}&in=state:${g.state}`
  return `for=tract:${g.tract}&in=state:${g.state}%20county:${g.county}`
}

async function acsRow(year: number, g: Geo): Promise<AcsFigures | null> {
  const key = process.env.CENSUS_API_KEY
  if (!key) throw new UsLookupError('CENSUS_API_KEY is not configured')
  const url = `https://api.census.gov/data/${year}/acs/acs5?get=${Object.values(ACS_VARS).join(',')}&${acsGeoParams(g)}&key=${key}`
  let rows: string[][]
  try {
    rows = await fetchJson<string[][]>(url, { timeoutMs: 20000 })
  } catch (err) {
    // A release that isn't out yet is a 404: the caller tries the previous one
    if (err instanceof UsLookupError && err.message === 'upstream 404') return null
    throw err
  }
  const [header, values] = rows
  if (!header || !values) return null
  const read = (v: string) => {
    const n = Number(values[header.indexOf(v)])
    // ACS marks suppressed or unavailable estimates with large negative sentinels
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  return {
    medianHouseholdIncome: read(ACS_VARS.medianHouseholdIncome),
    medianGrossRent: read(ACS_VARS.medianGrossRent),
    medianAge: read(ACS_VARS.medianAge),
    population: read(ACS_VARS.population),
  }
}

interface AcsCached { year: number; tract: AcsFigures | null; county: AcsFigures | null; us: AcsFigures | null }

async function lookupAcs(tractGeoid: string): Promise<AcsCached | null> {
  const state = tractGeoid.slice(0, 2), county = tractGeoid.slice(2, 5), tract = tractGeoid.slice(5)
  for (const year of ACS_YEARS) {
    const t = await acsRow(year, { kind: 'tract', state, county, tract })
    if (t === null) continue
    const [c, us] = await Promise.all([acsRow(year, { kind: 'county', state, county }), acsRow(year, { kind: 'us' })])
    return { year, tract: t, county: c, us }
  }
  return null
}

const cachedAcs = unstable_cache(lookupAcs, ['us-acs-v1'], { revalidate: 30 * DAY })

// ─── community: Opportunity Atlas ────────────────────────────────────────────

interface AtlasFile { nationalMeanP25: number; tracts: Record<string, Record<string, [number, number]>> }
let atlas: Promise<AtlasFile> | null = null

/** 1.4 MB, so only loaded (once per server instance) when first needed */
function loadAtlas(): Promise<AtlasFile> {
  atlas ??= import('./data/us-opportunity-atlas.json').then(m => m.default as unknown as AtlasFile)
  return atlas
}

/** Estimates from fewer children than this are too noisy to show */
const MIN_ATLAS_CHILDREN = 20

async function mobilityFor(lat: number, lng: number): Promise<UsCommunityResult['mobility']> {
  const tract2010 = await censusTract2010(lat, lng)
  if (!tract2010) return null
  const file = await loadAtlas()
  const row = file.tracts[tract2010.slice(0, 5)]?.[tract2010.slice(5)]
  if (!row || row[1] < MIN_ATLAS_CHILDREN) return null
  return { p25: row[0] / 10, nationalP25: file.nationalMeanP25 / 10, children: row[1], tract2010 }
}

export async function getUsCommunity(lat: number, lng: number): Promise<UsCommunityResult> {
  const units = await orError(() => censusUnits(lat, lng), null, 'us-census-units')
  const [acs, mobility] = await Promise.all([
    units ? orError(() => cachedAcs(units.tractGeoid), null, 'us-acs') : Promise.resolve(null),
    orError(async () => ({ value: await mobilityFor(lat, lng) }), null, 'us-opportunity'),
  ])
  const population = acs?.tract?.population ?? null
  return {
    status: !units || !acs ? 'error' : acs.tract ? 'ok' : 'no_data',
    acsPeriod: acs ? `${acs.year - 4}–${acs.year}` : null,
    tract: acs?.tract ?? null,
    county: acs?.county ?? null,
    us: acs?.us ?? null,
    densityPerSqMi: population !== null && units?.tractLandM2 ? Math.round(population / (units.tractLandM2 / SQ_M_PER_SQ_MI)) : null,
    tractName: units ? `Census tract ${units.tractGeoid}` : null,
    countyName: units?.countyName ?? null,
    mobilityStatus: !mobility ? 'error' : mobility.value ? 'ok' : 'no_data',
    mobility: mobility?.value ?? null,
  }
}

// ─── safety: FBI Crime Data Explorer ─────────────────────────────────────────

const CDE = 'https://api.usa.gov/crime/fbi/cde'

interface Agency { ori: string; name: string; type: string; counties: string }

async function lookupAgencies(stateAbbr: string): Promise<Agency[]> {
  const key = process.env.DATA_GOV_API_KEY
  if (!key) throw new UsLookupError('DATA_GOV_API_KEY is not configured')
  const data = await fetchJson<Record<string, Array<{ ori?: string; agency_name?: string; agency_type_name?: string; counties?: string }>>>(
    `${CDE}/agency/byStateAbbr/${encodeURIComponent(stateAbbr)}?API_KEY=${key}`,
    { timeoutMs: 30000 }
  )
  if (!data || typeof data !== 'object') throw new UsLookupError('FBI CDE: unexpected agency list')
  return Object.values(data).flat()
    .filter(a => a.ori && a.agency_name)
    .map(a => ({ ori: a.ori!, name: a.agency_name!, type: a.agency_type_name ?? '', counties: a.counties ?? '' }))
}

const cachedAgencies = unstable_cache(lookupAgencies, ['us-fbi-agencies-v1'], { revalidate: 30 * DAY })

/** "Phoenix city" → "phoenix"; "Nashville-Davidson metropolitan government (balance)" → "nashville-davidson" */
function placeBase(name: string): string {
  return name
    .replace(/\s*\(.*\)\s*$/, '')
    .replace(/\s+(city and borough|metropolitan government|consolidated government|unified government|urban county|city|town|village|borough|municipality|township|plantation)$/i, '')
    .trim()
    .toLowerCase()
}

/** The address's city police department, or else its county sheriff */
export function matchAgency(units: CensusUnits, agencies: Agency[]): { agency: Agency; by: 'city' | 'county' } | null {
  if (units.place) {
    // Consolidated city-counties are named for both ("Nashville-Davidson"); their police use the city part
    const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const full = placeBase(units.place.name)
    // Full name first ("Winston-Salem"), then the city part of a consolidated name ("Nashville")
    const base = [...new Set([full, full.split('-')[0]])].map(esc).join('|')
    // The city's own department only: "New York City Police Department" for
    // New York and "Metropolitan Nashville Police Department" for Nashville,
    // but never "New York Mills Village Police Department"
    const own = new RegExp(`^(metropolitan )?(${base})( (city|town|village|borough|township))? police (department|dept\\.?)$`, 'i')
    const city = agencies.find(a => a.type === 'City' && own.test(a.name.trim()))
    if (city) return { agency: city, by: 'city' }
  }
  const county = units.countyName.replace(/\s+(County|Parish|Borough|Census Area|Municipality|city)$/i, '').toUpperCase()
  const inCounty = agencies.filter(a => a.type === 'County' && a.counties.toUpperCase().split(/,\s*/).includes(county))
  // Some counties have a county police department (Arlington, Fairfax, Nassau…) that does the policing; else the sheriff
  const countyPolice = inCounty.find(a => /county police/i.test(a.name))
  const sheriff = inCounty.find(a => /sheriff/i.test(a.name))
  const agency = countyPolice ?? sheriff
  return agency ? { agency, by: 'county' } : null
}

type Series = Record<string, number>
interface Summary { offenses?: { rates?: Record<string, Series> } }

/** A full year of monthly rates summed, or null when any month is missing */
function annual(series: Series | undefined, year: number): number | null {
  if (!series) return null
  let sum = 0
  for (let m = 1; m <= 12; m++) {
    const v = series[`${String(m).padStart(2, '0')}-${year}`]
    if (typeof v !== 'number') return null
    sum += v
  }
  return Math.round(sum)
}

interface SafetyCached { year: number; rates: CrimeRates; stateRates: CrimeRates; usRates: CrimeRates; stateName: string | null }

async function lookupSafety(ori: string, agencyName: string): Promise<SafetyCached | null> {
  const key = process.env.DATA_GOV_API_KEY
  if (!key) throw new UsLookupError('DATA_GOV_API_KEY is not configured')
  // Last year once the FBI has published it all, else the year before
  const thisYear = new Date().getUTCFullYear()
  for (const year of [thisYear - 1, thisYear - 2]) {
    const range = `from=01-${year}&to=12-${year}`
    const [v, p] = await Promise.all(['V', 'P'].map(code =>
      fetchJson<Summary>(`${CDE}/summarized/agency/${encodeURIComponent(ori)}/${code}?${range}&API_KEY=${key}`, { timeoutMs: 30000 })
    ))
    const pick = (s: Summary, suffix: string, exclude?: string) => {
      const entry = Object.entries(s.offenses?.rates ?? {}).find(([k]) => k.endsWith(suffix) && (!exclude || !k.startsWith(exclude)))
      return entry?.[1]
    }
    const agencyKey = `${agencyName} Offenses`
    const violent = annual(v.offenses?.rates?.[agencyKey], year)
    const property = annual(p.offenses?.rates?.[agencyKey], year)
    if (violent === null && property === null) continue
    const stateEntry = Object.keys(v.offenses?.rates ?? {}).find(k => k.endsWith(' Offenses') && k !== agencyKey && !k.startsWith('United States'))
    return {
      year,
      rates: { violent, property },
      stateRates: { violent: annual(stateEntry ? v.offenses?.rates?.[stateEntry] : undefined, year), property: annual(stateEntry ? p.offenses?.rates?.[stateEntry] : undefined, year) },
      usRates: { violent: annual(pick(v, 'United States Offenses'), year), property: annual(pick(p, 'United States Offenses'), year) },
      stateName: stateEntry ? stateEntry.replace(/ Offenses$/, '') : null,
    }
  }
  return null
}

const cachedSafety = unstable_cache(lookupSafety, ['us-fbi-safety-v1'], { revalidate: 30 * DAY })

/**
 * 0-100 from the agency's rates relative to the US: 70 at the national rate,
 * 30 points per doubling or halving, violent crime weighted 70 %. Rates are
 * per resident of the whole jurisdiction, so this is a city-level figure.
 */
export function scoreForCrime(rates: CrimeRates, us: CrimeRates): number | null {
  const parts: Array<[number, number]> = []
  if (rates.violent !== null && us.violent) parts.push([rates.violent / us.violent, 0.7])
  if (rates.property !== null && us.property) parts.push([rates.property / us.property, 0.3])
  if (!parts.length) return null
  const ratio = parts.reduce((s, [r, w]) => s + r * w, 0) / parts.reduce((s, [, w]) => s + w, 0)
  return Math.round(Math.max(0, Math.min(100, 70 - 30 * Math.log2(Math.max(ratio, 0.01)))))
}

export async function getUsSafety(lat: number, lng: number): Promise<UsSafetyResult> {
  const empty = { agency: null, matchedBy: null, year: null, rates: null, stateRates: null, usRates: null, stateName: null, score: null }
  const units = await orError(() => censusUnits(lat, lng), null, 'us-census-units')
  if (!units) return { status: 'error', ...empty }
  const agencies = await orError(() => cachedAgencies(units.stateAbbr), null, 'us-fbi-agencies')
  if (!agencies) return { status: 'error', ...empty }
  const match = matchAgency(units, agencies)
  if (!match) return { status: 'no_data', ...empty, message: 'No reporting police agency found for this city or county.' }

  const agency = { ori: match.agency.ori, name: match.agency.name, type: match.agency.type }
  const data = await orError(() => cachedSafety(match.agency.ori, match.agency.name), undefined, 'us-fbi-summary')
  if (data === undefined) return { status: 'error', ...empty, agency, matchedBy: match.by }
  if (data === null) return { status: 'no_data', ...empty, agency, matchedBy: match.by, message: `${agency.name} hasn't reported a full recent year to the FBI.` }
  return {
    status: 'ok',
    agency,
    matchedBy: match.by,
    year: data.year,
    rates: data.rates,
    stateRates: data.stateRates,
    usRates: data.usRates,
    stateName: data.stateName,
    score: scoreForCrime(data.rates, data.usRates),
  }
}

// ─── rent: HUD Fair Market Rents ─────────────────────────────────────────────

const HUD = 'https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services'
const SAFMR_ZCTA = `${HUD}/HUD_PDR_Small_Area_Fair_Market_Rents/FeatureServer/0`
const SAFMR_TABLE = `${HUD}/HUD_PDR_Small_Area_Fair_Market_Rents/FeatureServer/1`
const FMR_AREAS = `${HUD}/Fair_Market_Rents/FeatureServer/0`
// Both services currently carry FY2026 (Oct 2025 – Sep 2026) figures, per their item metadata
export const HUD_FMR_YEAR = 'FY2026'

type FiveRents = [number, number, number, number, number]

function fiveRents(a: Record<string, unknown>, prefix: string, suffix: string): FiveRents | null {
  const vals = [0, 1, 2, 3, 4].map(b => a[`${prefix}${b}${suffix}`])
  return vals.every(v => typeof v === 'number' && v > 0) ? (vals as FiveRents) : null
}

async function lookupRent(lat: number, lng: number): Promise<UsRentResult> {
  const point = { geometry: `${lng},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects' }
  const [zctas, areas] = await Promise.all([
    arcgis<{ ZCTA5CE20: string | null }>(SAFMR_ZCTA, { ...point, outFields: 'ZCTA5CE20' }),
    arcgis<Record<string, unknown>>(FMR_AREAS, { ...point, outFields: 'FMR_CODE,FMR_AREANAME,FMR_0BDR,FMR_1BDR,FMR_2BDR,FMR_3BDR,FMR_4BDR' }),
  ])
  const area = areas[0]
  const areaName = typeof area?.FMR_AREANAME === 'string' ? area.FMR_AREANAME : null
  const zip = zctas[0]?.ZCTA5CE20 ?? null

  if (zip) {
    const rows = await arcgis<Record<string, unknown>>(SAFMR_TABLE, {
      where: `ID='${zip.replace(/\D/g, '')}'`,
      outFields: 'HUD_CODE,FMR_NAME,SAFMR_0BR,SAFMR_1BR,SAFMR_2BR,SAFMR_3BR,SAFMR_4BR',
    })
    // A ZIP that straddles metro areas has a row for each: use the address's own
    const row = rows.find(r => r.HUD_CODE === area?.FMR_CODE) ?? rows[0]
    const rents = row ? fiveRents(row, 'SAFMR_', 'BR') : null
    if (rents) return { status: 'ok', byBedrooms: rents, level: 'zip', zip, areaName: typeof row.FMR_NAME === 'string' ? row.FMR_NAME : areaName, fiscalYear: HUD_FMR_YEAR }
  }
  const rents = area ? fiveRents(area, 'FMR_', 'BDR') : null
  if (rents) return { status: 'ok', byBedrooms: rents, level: 'area', zip, areaName, fiscalYear: HUD_FMR_YEAR }
  return { status: 'no_data', byBedrooms: null, level: null, zip, areaName, fiscalYear: HUD_FMR_YEAR }
}

const cachedRent = unstable_cache(lookupRent, ['us-hud-fmr-v1'], { revalidate: 30 * DAY })

export async function getUsRent(lat: number, lng: number): Promise<UsRentResult> {
  return (await orError(() => cachedRent(roundCoord(lat), roundCoord(lng)), null, 'us-hud-fmr'))
    ?? { status: 'error', byBedrooms: null, level: null, zip: null, areaName: null, fiscalYear: HUD_FMR_YEAR }
}
