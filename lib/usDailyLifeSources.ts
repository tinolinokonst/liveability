// Server-side lookups for the US "getting around and daily life" cards:
//
// - Walkability: EPA Smart Location Database, National Walkability Index for
//   the block group (point query on EPA's service).
// - Transit: OpenStreetMap stops via Overpass, plus the Mobility Database for
//   the GTFS feeds (agencies) whose service area covers the address.
// - Schools: NCES EDGE public and private school locations.
// - Food access: OpenStreetMap supermarkets and grocery stores, plus the USDA
//   Food Access Research Atlas low-income / low-access flags for the tract.
// - Broadband: FCC National Broadband Map, county figures (urban or rural
//   part) from lib/data/us-broadband.json — see scripts/build-us-broadband.py
//   for why it's prebuilt.
// - Health: CDC PLACES tract (and county) estimates, and the CDC/ATSDR Social
//   Vulnerability Index for the tract.
//
// Same rules as the other US lookups (lib/usUpstream.ts): parsed results are
// cached, failures throw and are never cached, every part degrades on its own.
// "Nearest outside the radius": when nothing is within a physical amenity's
// radius, the nearest one farther out is returned instead, never a guess.

import { unstable_cache } from 'next/cache'
import broadbandData from './data/us-broadband.json'
import { censusUnits } from './usGeography'
import { fetchJson, fetchUpstream, haversineKm, orError, roundCoord, UsLookupError } from './usUpstream'
import type {
  BroadbandArea,
  HealthMeasure,
  TransitFeed,
  UsBroadbandResult,
  UsFoodAccessResult,
  UsHealthResult,
  UsNearby,
  UsPlace,
  UsSchoolsResult,
  UsTransitResult,
  UsWalkabilityResult,
} from './types'

const DAY = 24 * 60 * 60
const KM_PER_MILE = 1.609344
const round3 = (km: number) => Math.round(km * 1000) / 1000

interface ArcGisQuery<A> { features?: Array<{ attributes: A }>; error?: { message?: string } }

async function arcgisFeatures<A>(url: string, params: Record<string, string>): Promise<A[]> {
  const qs = new URLSearchParams({ returnGeometry: 'false', f: 'json', ...params })
  const data = await fetchJson<ArcGisQuery<A>>(`${url}/query?${qs}`, { timeoutMs: 15000 })
  if (data.error || !Array.isArray(data.features)) throw new UsLookupError(`ArcGIS: ${data.error?.message ?? 'unexpected response'}`)
  return data.features.map(f => f.attributes)
}

function pointParams(lat: number, lng: number, extra: Record<string, string> = {}): Record<string, string> {
  return { geometry: `${lng},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', ...extra }
}

/** Within radiusKm: the nearest `keep` and the count; none → the nearest of `far`, if any */
function nearby(near: UsPlace[], far: UsPlace[], radiusKm: number, keep = 25): UsNearby {
  const inRadius = near.filter(p => p.distanceKm <= radiusKm).sort((a, b) => a.distanceKm - b.distanceKm)
  const outside = inRadius.length ? null : [...far].sort((a, b) => a.distanceKm - b.distanceKm)[0] ?? null
  return { radiusKm, count: inRadius.length, places: inRadius.slice(0, keep), nearestOutside: outside }
}

// ─── walkability (EPA Smart Location Database) ───────────────────────────────

const WALKABILITY = 'https://geodata.epa.gov/arcgis/rest/services/OA/WalkabilityIndex/MapServer/0'

interface WalkAttrs {
  GEOID20: string | null
  NatWalkInd: number | null
  D2A_Ranked: number | null
  D2B_Ranked: number | null
  D3B_Ranked: number | null
  D4A_Ranked: number | null
}

/** EPA's index runs 1-20; the card's 0-100 bar is the same scale stretched */
export function scoreForWalkIndex(index: number): number {
  return Math.round(Math.max(0, Math.min(100, ((index - 1) / 19) * 100)))
}

async function lookupWalkability(lat: number, lng: number): Promise<UsWalkabilityResult> {
  const rows = await arcgisFeatures<WalkAttrs>(WALKABILITY, pointParams(lat, lng, { outFields: 'GEOID20,NatWalkInd,D2A_Ranked,D2B_Ranked,D3B_Ranked,D4A_Ranked' }))
  const r = rows[0]
  if (!r || typeof r.NatWalkInd !== 'number') {
    return { status: 'no_data', index: null, score: null, ranks: null, blockGroup: r?.GEOID20 ?? null }
  }
  const rank = (v: number | null) => (typeof v === 'number' ? v : 0)
  return {
    status: 'ok',
    index: Math.round(r.NatWalkInd * 10) / 10,
    score: scoreForWalkIndex(r.NatWalkInd),
    ranks: {
      intersectionDensity: rank(r.D3B_Ranked),
      transitProximity: rank(r.D4A_Ranked),
      employmentMix: rank(r.D2B_Ranked),
      employmentHousingMix: rank(r.D2A_Ranked),
    },
    blockGroup: r.GEOID20,
  }
}

const cachedWalkability = unstable_cache(lookupWalkability, ['us-walkability-v1'], { revalidate: 30 * DAY })

export async function getUsWalkability(lat: number, lng: number): Promise<UsWalkabilityResult> {
  return (await orError(() => cachedWalkability(roundCoord(lat), roundCoord(lng)), null, 'us-walkability'))
    ?? { status: 'error', index: null, score: null, ranks: null, blockGroup: null }
}

// ─── OpenStreetMap: transit stops and grocery stores (Overpass) ──────────────

// overpass.osm.ch (used for Swiss addresses) only holds Swiss data
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
export const TRANSIT_RADIUS_KM = 0.5 * KM_PER_MILE
export const GROCERY_RADIUS_KM = 1 * KM_PER_MILE // USDA's urban low-access distance
const TRANSIT_FAR_M = 5000
const GROCERY_FAR_M = Math.round(10 * KM_PER_MILE * 1000) // USDA's rural distance

const TRANSIT_SELECTORS = [
  'node["highway"="bus_stop"]',
  'node["railway"~"^(station|halt|tram_stop)$"]',
  'node["public_transport"="station"]',
  'node["amenity"="ferry_terminal"]',
]
const GROCERY_SELECTORS = ['nwr["shop"~"^(supermarket|grocery|greengrocer)$"]']

interface OsmElement { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

function transitKind(t: Record<string, string>): string {
  if (t.amenity === 'ferry_terminal') return 'Ferry terminal'
  if (t.railway === 'tram_stop') return 'Tram / light rail stop'
  if (t.railway === 'station' || t.railway === 'halt' || t.public_transport === 'station') {
    return t.station === 'subway' || t.subway === 'yes' ? 'Subway station' : 'Rail station'
  }
  return 'Bus stop'
}

function groceryKind(t: Record<string, string>): string {
  return t.shop === 'supermarket' ? 'Supermarket' : t.shop === 'greengrocer' ? 'Greengrocer' : 'Grocery store'
}

async function overpass(query: string): Promise<OsmElement[]> {
  let last: unknown = null
  for (const url of OVERPASS) {
    try {
      const res = await fetchUpstream(url, {
        // Build scripts (scripts/build-us-areas.mts) may wait longer than a request should
        timeoutMs: Number(process.env.OVERPASS_TIMEOUT_MS) || 15000,
        method: 'POST',
        body: new URLSearchParams({ data: query }).toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      const data = (await res.json()) as { elements?: OsmElement[]; remark?: string }
      // A timed-out query still answers 200, with a remark and partial data
      if (!Array.isArray(data.elements) || data.remark?.includes('error')) throw new UsLookupError(`Overpass: ${data.remark ?? 'unexpected response'}`)
      return data.elements
    } catch (err) {
      last = err
    }
  }
  throw last instanceof Error ? last : new UsLookupError('Overpass unavailable')
}

function toPlaces(elements: OsmElement[], lat: number, lng: number, kind: (t: Record<string, string>) => string): UsPlace[] {
  const out: UsPlace[] = []
  for (const e of elements) {
    const plat = e.lat ?? e.center?.lat
    const plng = e.lon ?? e.center?.lon
    if (plat === undefined || plng === undefined || !e.tags) continue
    out.push({
      // Some stops carry only their stop code as a name ("10274"): show the kind instead
      name: e.tags.name && !/^\d+$/.test(e.tags.name.trim()) ? e.tags.name : null,
      kind: kind(e.tags),
      distanceKm: round3(haversineKm(lat, lng, plat, plng)),
      lat: plat,
      lng: plng,
      url: `https://www.openstreetmap.org/${e.type}/${e.id}`,
    })
  }
  return out
}

const isTransit = (t?: Record<string, string>) =>
  !!t && (t.highway === 'bus_stop' || /^(station|halt|tram_stop)$/.test(t.railway ?? '') || t.public_transport === 'station' || t.amenity === 'ferry_terminal')
const isGrocery = (t?: Record<string, string>) => !!t && /^(supermarket|grocery|greengrocer)$/.test(t.shop ?? '')

interface OsmNearby { transit: UsNearby; stationCount: number; grocery: UsNearby }

async function lookupOsm(lat: number, lng: number): Promise<OsmNearby> {
  const around = (sel: string[], m: number) => sel.map(s => `${s}(around:${m},${lat},${lng});`).join('')
  const near = await overpass(
    `[out:json][timeout:25];(${around(TRANSIT_SELECTORS, Math.round(TRANSIT_RADIUS_KM * 1000))}${around(GROCERY_SELECTORS, Math.round(GROCERY_RADIUS_KM * 1000))});out center tags;`
  )
  const transitNear = toPlaces(near.filter(e => isTransit(e.tags)), lat, lng, transitKind)
  const groceryNear = toPlaces(near.filter(e => isGrocery(e.tags)), lat, lng, groceryKind)

  // Only when a radius came up empty: search farther for the nearest one
  const needTransit = !transitNear.some(p => p.distanceKm <= TRANSIT_RADIUS_KM)
  const needGrocery = !groceryNear.some(p => p.distanceKm <= GROCERY_RADIUS_KM)
  let far: OsmElement[] = []
  if (needTransit || needGrocery) {
    far = await overpass(
      `[out:json][timeout:25];(${needTransit ? around(TRANSIT_SELECTORS, TRANSIT_FAR_M) : ''}${needGrocery ? around(GROCERY_SELECTORS, GROCERY_FAR_M) : ''});out center tags;`
    )
  }
  const transit = nearby(transitNear, toPlaces(far.filter(e => isTransit(e.tags)), lat, lng, transitKind), TRANSIT_RADIUS_KM, 40)
  return {
    transit,
    stationCount: transitNear.filter(p => p.distanceKm <= TRANSIT_RADIUS_KM && p.kind !== 'Bus stop').length,
    grocery: nearby(groceryNear, toPlaces(far.filter(e => isGrocery(e.tags)), lat, lng, groceryKind), GROCERY_RADIUS_KM),
  }
}

// OSM changes, but not daily
const cachedOsm = unstable_cache(lookupOsm, ['us-osm-nearby-v1'], { revalidate: 7 * DAY })

// ─── transit feeds (Mobility Database) ───────────────────────────────────────

const MOBILITY_API = 'https://api.mobilitydatabase.org/v1'
let mobilityToken: { value: string; expires: number } | null = null

/** Access tokens last an hour; one is exchanged from the refresh token and reused */
async function mobilityAccessToken(): Promise<string> {
  if (mobilityToken && mobilityToken.expires > Date.now()) return mobilityToken.value
  const refresh = process.env.MOBILITY_DB_REFRESH_TOKEN
  if (!refresh) throw new UsLookupError('MOBILITY_DB_REFRESH_TOKEN is not configured')
  const res = await fetchUpstream(`${MOBILITY_API}/tokens`, {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refresh }),
    headers: { 'Content-Type': 'application/json' },
  })
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new UsLookupError('Mobility Database: no access token')
  mobilityToken = { value: data.access_token, expires: Date.now() + 50 * 60 * 1000 }
  return data.access_token
}

interface MdbBox { minimum_latitude?: number; maximum_latitude?: number; minimum_longitude?: number; maximum_longitude?: number }
interface MdbFeed {
  id: string
  provider?: string
  feed_name?: string
  status?: string
  official?: boolean | null
  locations?: Array<{ country_code?: string }> | null
  bounding_box?: MdbBox | null
  latest_dataset?: { bounding_box?: MdbBox | null } | null
}

/** The feed's own stops bounding box contains the point (with ~1 km of slack) */
function covers(b: MdbBox | null, lat: number, lng: number): boolean {
  if (!b || [b.minimum_latitude, b.maximum_latitude, b.minimum_longitude, b.maximum_longitude].some(v => typeof v !== 'number')) return false
  const m = 0.01
  return lat >= b.minimum_latitude! - m && lat <= b.maximum_latitude! + m && lng >= b.minimum_longitude! - m && lng <= b.maximum_longitude! + m
}

// A service area wider than this is intercity or statewide (Amtrak, Megabus,
// or a feed with stray stops far away): it says nothing about this address,
// so it isn't listed
const WIDE_DEGREES = 2

async function lookupFeeds(lat: number, lng: number): Promise<TransitFeed[]> {
  const token = await mobilityAccessToken()
  const params = new URLSearchParams({
    limit: '100',
    dataset_latitudes: `${lat - 0.01},${lat + 0.01}`,
    dataset_longitudes: `${lng - 0.01},${lng + 0.01}`,
    bounding_filter_method: 'partially_enclosed',
  })
  const feeds = await fetchJson<MdbFeed[]>(`${MOBILITY_API}/gtfs_feeds?${params}`, { headers: { Authorization: `Bearer ${token}` }, timeoutMs: 20000 })
  if (!Array.isArray(feeds)) throw new UsLookupError('Mobility Database: unexpected response')
  return feeds
    // The API's area filter also returns feeds whose search box is wrong (a
    // Spanish rail feed for Brooklyn), so the match is checked here against
    // the latest dataset's actual stops, and limited to US feeds
    .filter(f => f.status === 'active')
    .filter(f => f.locations?.some(l => l.country_code === 'US'))
    .filter(f => {
      const b = f.latest_dataset?.bounding_box ?? f.bounding_box ?? null
      if (!covers(b, lat, lng)) return false
      const span = Math.max(b!.maximum_latitude! - b!.minimum_latitude!, b!.maximum_longitude! - b!.minimum_longitude!)
      return span <= WIDE_DEGREES
    })
    .map(f => {
      const provider = (f.provider ?? 'Unnamed agency').trim()
      return {
        id: f.id,
        provider: provider.length > 120 ? `${provider.slice(0, 117)}…` : provider,
        feedName: f.feed_name?.trim() || null,
        official: f.official ?? null,
        url: `https://mobilitydatabase.org/feeds/gtfs/${encodeURIComponent(f.id)}`,
      }
    })
    .sort((a, b) => a.provider.localeCompare(b.provider) || (a.feedName ?? '').localeCompare(b.feedName ?? ''))
}

// ~5 km cells: a feed's service area doesn't end at a street
const cachedFeeds = unstable_cache(lookupFeeds, ['us-mobilitydb-feeds-v3'], { revalidate: 7 * DAY })

/** Same scale as the Swiss OSM transit score: 10 or more stops within reach is full marks */
export function scoreForStopCount(count: number): number {
  return Math.min(100, Math.round((count / 10) * 100))
}

export async function getUsTransit(lat: number, lng: number): Promise<UsTransitResult> {
  const [osm, feeds] = await Promise.all([
    orError(() => cachedOsm(roundCoord(lat), roundCoord(lng)), null, 'us-osm'),
    orError(() => cachedFeeds(roundCoord(lat, 2), roundCoord(lng, 2)), null, 'us-mobilitydb'),
  ])
  return {
    status: osm ? 'ok' : 'error',
    stops: osm?.transit ?? null,
    stationCount: osm?.stationCount ?? 0,
    score: osm ? scoreForStopCount(osm.transit.count) : null,
    feedsStatus: feeds ? (feeds.length ? 'ok' : 'no_data') : 'error',
    feeds: feeds ?? [],
  }
}

// ─── food access (OSM grocery + USDA Food Access Research Atlas) ─────────────

const FARA = 'https://gisportal.ers.usda.gov/server/rest/services/FARA/FARA_2025_StraightLine/MapServer/4'

interface FaraAttrs {
  CensusTract20: string | null
  Urban: number | null
  LowIncomeTracts: number | null
  SD_SRAM_LILATracts_1And10: number | null
  SD_SRAM_LILATracts_halfAnd10: number | null
  SD_SRAM_LA1and10: number | null
  PovertyRate: number | null
}

async function lookupFara(lat: number, lng: number): Promise<UsFoodAccessResult['usda']> {
  const rows = await arcgisFeatures<FaraAttrs>(FARA, pointParams(lat, lng, {
    outFields: 'CensusTract20,Urban,LowIncomeTracts,SD_SRAM_LILATracts_1And10,SD_SRAM_LILATracts_halfAnd10,SD_SRAM_LA1and10,PovertyRate',
  }))
  const r = rows[0]
  if (!r?.CensusTract20) return null
  return {
    tract: r.CensusTract20,
    urban: r.Urban === 1,
    lowIncome: r.LowIncomeTracts === 1,
    lila1And10: r.SD_SRAM_LILATracts_1And10 === 1,
    lilaHalfAnd10: r.SD_SRAM_LILATracts_halfAnd10 === 1,
    lowAccess1And10: r.SD_SRAM_LA1and10 === 1,
    povertyRate: typeof r.PovertyRate === 'number' && r.PovertyRate >= 0 ? r.PovertyRate : null,
  }
}

const cachedFara = unstable_cache(lookupFara, ['us-fara-v1'], { revalidate: 30 * DAY })

export async function getUsFoodAccess(lat: number, lng: number): Promise<UsFoodAccessResult> {
  const [osm, usda] = await Promise.all([
    orError(() => cachedOsm(roundCoord(lat), roundCoord(lng)), null, 'us-osm'),
    orError(async () => ({ value: await cachedFara(roundCoord(lat), roundCoord(lng)) }), null, 'us-fara'),
  ])
  return {
    groceryStatus: osm ? 'ok' : 'error',
    grocery: osm?.grocery ?? null,
    usdaStatus: !usda ? 'error' : usda.value ? 'ok' : 'no_data',
    usda: usda?.value ?? null,
  }
}

// ─── schools (NCES EDGE) ─────────────────────────────────────────────────────

const NCES = 'https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services'
const PUBLIC_SCHOOLS = `${NCES}/Public_School_Locations_Current/FeatureServer/0`
const PRIVATE_SCHOOLS = `${NCES}/Private_School_Locations_Current/FeatureServer/0`
export const SCHOOL_RADIUS_MILES = 1
const SCHOOL_FAR_MILES = [5, 25]

interface SchoolAttrs { NAME: string | null; LAT: number | null; LON: number | null; SCHOOLYEAR: string | null; NCESSCH?: string | null; PPIN?: string | null }

interface SchoolPage { places: UsPlace[]; publicYear: string | null; privateYear: string | null }

async function schoolsWithin(lat: number, lng: number, miles: number): Promise<SchoolPage> {
  const params = pointParams(lat, lng, { distance: String(miles), units: 'esriSRUnit_StatuteMile' })
  const [pub, priv] = await Promise.all([
    arcgisFeatures<SchoolAttrs>(PUBLIC_SCHOOLS, { ...params, outFields: 'NAME,LAT,LON,SCHOOLYEAR,NCESSCH' }),
    arcgisFeatures<SchoolAttrs>(PRIVATE_SCHOOLS, { ...params, outFields: 'NAME,LAT,LON,SCHOOLYEAR,PPIN' }),
  ])
  const place = (s: SchoolAttrs, kind: string, url: string): UsPlace | null =>
    typeof s.LAT === 'number' && typeof s.LON === 'number'
      ? { name: s.NAME?.trim() || null, kind, distanceKm: round3(haversineKm(lat, lng, s.LAT, s.LON)), lat: s.LAT, lng: s.LON, url }
      : null
  // Districts sometimes keep a closed school in the current file, renamed "… - Closed"
  const open = (s: SchoolAttrs) => !/\bclosed\b/i.test(s.NAME ?? '')
  return {
    places: [
      ...pub.filter(open).map(s => place(s, 'Public school', `https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=${encodeURIComponent(s.NCESSCH ?? '')}`)),
      ...priv.filter(open).map(s => place(s, 'Private school', `https://nces.ed.gov/surveys/pss/privateschoolsearch/school_detail.asp?ID=${encodeURIComponent(s.PPIN ?? '')}`)),
    ].filter((p): p is UsPlace => p !== null),
    publicYear: pub.find(s => s.SCHOOLYEAR)?.SCHOOLYEAR ?? null,
    privateYear: priv.find(s => s.SCHOOLYEAR)?.SCHOOLYEAR ?? null,
  }
}

async function lookupSchools(lat: number, lng: number): Promise<UsSchoolsResult> {
  const radiusKm = SCHOOL_RADIUS_MILES * KM_PER_MILE
  const near = await schoolsWithin(lat, lng, SCHOOL_RADIUS_MILES)
  let far: UsPlace[] = []
  if (!near.places.some(p => p.distanceKm <= radiusKm)) {
    for (const miles of SCHOOL_FAR_MILES) {
      far = (await schoolsWithin(lat, lng, miles)).places
      if (far.length) break
    }
  }
  return { status: 'ok', schools: nearby(near.places, far, radiusKm), publicYear: near.publicYear, privateYear: near.privateYear }
}

const cachedSchools = unstable_cache(lookupSchools, ['us-nces-schools-v1'], { revalidate: 30 * DAY })

export async function getUsSchools(lat: number, lng: number): Promise<UsSchoolsResult> {
  return (await orError(() => cachedSchools(roundCoord(lat), roundCoord(lng)), null, 'us-schools'))
    ?? { status: 'error', schools: null, publicYear: null, privateYear: null }
}

// ─── broadband (FCC, prebuilt county table) ──────────────────────────────────

type PackedArea = [number, number, number, number, number] | null
const BROADBAND = broadbandData as unknown as { asOf: string; fields: string[]; counties: Record<string, [string, PackedArea, PackedArea, PackedArea]> }
/** Below this many homes, an urban or rural part says too little; use the whole county */
const MIN_AREA_UNITS = 500

function unpack(a: PackedArea): BroadbandArea | null {
  if (!a) return null
  const [units, wired100, wired1000, fiber100, terrestrial100] = a
  return { units, wired100, wired1000, fiber100, terrestrial100 }
}

export async function getUsBroadband(lat: number, lng: number): Promise<UsBroadbandResult> {
  const units = await orError(() => censusUnits(lat, lng), null, 'us-census-units')
  if (!units) return { status: 'error', county: null, area: null, figures: null, asOf: BROADBAND.asOf }
  const row = BROADBAND.counties[units.countyGeoid]
  if (!row) return { status: 'no_data', county: units.countyName || null, area: null, figures: null, asOf: BROADBAND.asOf }
  const [name, total, urban, rural] = row
  const part = unpack(units.urban ? urban : rural)
  const usePart = part && part.units >= MIN_AREA_UNITS
  return {
    status: 'ok',
    county: name,
    area: usePart ? (units.urban ? 'urban' : 'rural') : 'total',
    figures: usePart ? part : unpack(total),
    asOf: BROADBAND.asOf,
  }
}

// ─── health (CDC PLACES + SVI) ───────────────────────────────────────────────

const PLACES_TRACTS = 'https://data.cdc.gov/resource/yjkw-uj5s.json' // PLACES 2025 release, census tracts
const PLACES_COUNTIES = 'https://data.cdc.gov/resource/swc5-untb.json' // PLACES 2025 release, counties
const SVI_TRACTS = 'https://onemap.cdc.gov/OneMapServices/rest/services/SVI/CDC_ATSDR_Social_Vulnerability_Index_2022_USA/FeatureServer/2'

export const HEALTH_MEASURES: Array<Omit<HealthMeasure, 'tract' | 'county'>> = [
  { id: 'ACCESS2', label: 'No health insurance (ages 18–64)', higherIsBetter: false },
  { id: 'CHECKUP', label: 'Routine checkup in the past year', higherIsBetter: true },
  { id: 'GHLTH', label: 'Fair or poor general health', higherIsBetter: false },
  { id: 'MHLTH', label: 'Frequent mental distress', higherIsBetter: false },
  { id: 'OBESITY', label: 'Obesity', higherIsBetter: false },
  { id: 'DIABETES', label: 'Diagnosed diabetes', higherIsBetter: false },
  { id: 'BPHIGH', label: 'High blood pressure', higherIsBetter: false },
  { id: 'CSMOKING', label: 'Current smoking', higherIsBetter: false },
  { id: 'LPA', label: 'No leisure-time physical activity', higherIsBetter: false },
  { id: 'FOODINSECU', label: 'Food insecurity', higherIsBetter: false },
  { id: 'LACKTRPT', label: 'Lacked reliable transportation', higherIsBetter: false },
  { id: 'LONELINESS', label: 'Loneliness', higherIsBetter: false },
]

const num = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}

interface PlacesCached { tract: Record<string, number | null> | null; county: Record<string, number | null> }

async function lookupPlaces(tractGeoid: string, countyGeoid: string): Promise<PlacesCached> {
  const [tractRows, countyRows] = await Promise.all([
    fetchJson<Array<Record<string, unknown>>>(`${PLACES_TRACTS}?tractfips=${tractGeoid}`),
    fetchJson<Array<{ measureid?: string; data_value?: string }>>(`${PLACES_COUNTIES}?locationid=${countyGeoid}&datavaluetypeid=CrdPrv&$limit=100`),
  ])
  if (!Array.isArray(tractRows) || !Array.isArray(countyRows)) throw new UsLookupError('PLACES: unexpected response')
  const t = tractRows[0]
  const county: Record<string, number | null> = {}
  for (const r of countyRows) if (r.measureid) county[r.measureid] = num(r.data_value)
  return {
    // The GIS-friendly tract table names columns <measure>_crudeprev (one has a stray trailing underscore)
    tract: t ? Object.fromEntries(HEALTH_MEASURES.map(m => [m.id, num(t[`${m.id.toLowerCase()}_crudeprev`] ?? t[`${m.id.toLowerCase()}_crudeprev_`])])) : null,
    county,
  }
}

const cachedPlaces = unstable_cache(lookupPlaces, ['us-cdc-places-v1'], { revalidate: 30 * DAY })

interface SviAttrs { RPL_THEMES: number | null; RPL_THEME1: number | null; RPL_THEME2: number | null; RPL_THEME3: number | null; RPL_THEME4: number | null }

async function lookupSvi(tractGeoid: string): Promise<UsHealthResult['svi']> {
  const rows = await arcgisFeatures<SviAttrs>(SVI_TRACTS, { where: `FIPS='${tractGeoid}'`, outFields: 'RPL_THEMES,RPL_THEME1,RPL_THEME2,RPL_THEME3,RPL_THEME4' })
  const r = rows[0]
  // -999 marks tracts CDC couldn't rank (no or too little population)
  const pct = (v: number | null) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : null)
  const overall = pct(r?.RPL_THEMES ?? null)
  if (overall === null) return null
  return { overall, socioeconomic: pct(r.RPL_THEME1), household: pct(r.RPL_THEME2), minority: pct(r.RPL_THEME3), housing: pct(r.RPL_THEME4) }
}

const cachedSvi = unstable_cache(lookupSvi, ['us-cdc-svi-v1'], { revalidate: 30 * DAY })

export async function getUsHealth(lat: number, lng: number): Promise<UsHealthResult> {
  const units = await orError(() => censusUnits(lat, lng), null, 'us-census-units')
  if (!units || !/^\d{11}$/.test(units.tractGeoid)) {
    return { placesStatus: 'error', measures: [], placesYear: null, sviStatus: 'error', svi: null, tract: null }
  }
  const [places, svi] = await Promise.all([
    orError(() => cachedPlaces(units.tractGeoid, units.countyGeoid), null, 'us-places'),
    orError(async () => ({ value: await cachedSvi(units.tractGeoid) }), null, 'us-svi'),
  ])
  const measures: HealthMeasure[] = places?.tract
    ? HEALTH_MEASURES.map(m => ({ ...m, tract: places.tract![m.id] ?? null, county: places.county[m.id] ?? null })).filter(m => m.tract !== null)
    : []
  return {
    placesStatus: !places ? 'error' : measures.length ? 'ok' : 'no_data',
    measures,
    placesYear: '2025 release',
    sviStatus: !svi ? 'error' : svi.value ? 'ok' : 'no_data',
    svi: svi?.value ?? null,
    tract: units.tractGeoid,
  }
}
