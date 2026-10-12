// Server-side lookups for the Risks section: cantonal hazard maps
// (Gefahrenkarten) and contaminated-site cadastres (Kataster der belasteten
// Standorte) from geodienste.ch, plus the three federal contaminated-site
// cadastres (public transport, civil airfields, military) from geo.admin.ch.
//
// Rules this module enforces:
// - Only cantons in lib/riskCoverage.ts are queried or shown. Features from any
//   other canton (e.g. across a border within 100 m) are discarded.
// - geodienste.ch fair use is 10 requests/minute per service for us as a
//   whole, so every request draws from a shared budget first. When it is
//   spent the lookup fails (and is not cached) instead of exceeding it.
// - Results are cached per coordinate (rounded to 1 m in LV95) for 30 days.
//   Failures throw, and unstable_cache never stores a thrown result, so an
//   outage or a spent budget is retried on the next request.
//
// Hazard levels come from one WMS GetFeatureInfo point query: the hazard-area
// polygons are dissolved per region (one feature can span 25 km), so fetching
// them as vectors per address would cost megabytes. The map shows the canton's
// own WMS rendering instead.

import { unstable_cache } from 'next/cache'
import { consumeSharedQuota } from './apiGuard'
import { findCommune } from './geoAdmin'
import { fromLv95, toLv95 } from './lv95'
import { cantonSource, CONTAMINATION_EXCLUDED, HAZARD_EXCLUDED } from './riskCoverage'
import type {
  ContaminatedSite,
  ContaminatedSiteStatus,
  ContaminatedSiteType,
  ContaminationResult,
  HazardLevel,
  HazardProcess,
  HazardResult,
  HazardType,
  HazardZone,
  RiskSourceCredit,
} from './types'

const CACHE_SECONDS = 30 * 24 * 60 * 60
const TIMEOUT_MS = 10000
export const CONTAMINATION_RADIUS_M = 100

const HAZARD_WMS = 'https://geodienste.ch/db/gefahrenkarten_v1_3_0/deu'
const KBS_OGCAPI = 'https://geodienste.ch/db/kataster_belasteter_standorte_v1_5_0/deu/ogcapi/collections'
const IDENTIFY = 'https://api3.geo.admin.ch/rest/services/api/MapServer/identify'
const LV95_CRS = 'http://www.opengis.net/def/crs/EPSG/0/2056'

/** Thrown for anything that should be retried rather than cached */
class RiskLookupError extends Error {}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    // no-store: caching happens once, on the parsed result, below
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    if (!res.ok) throw new RiskLookupError(`upstream ${res.status}`)
    return res
  } catch (err) {
    if (err instanceof RiskLookupError) throw err
    throw new RiskLookupError(err instanceof Error ? err.message : 'fetch failed')
  } finally {
    clearTimeout(timeout)
  }
}

async function spend(service: 'wms' | 'features'): Promise<void> {
  const ok = await consumeSharedQuota(`geodienste-${service}`, 10, 60)
  if (!ok) throw new RiskLookupError(`geodienste.ch ${service} fair-use budget spent`)
}

async function resolveCanton(e: number, n: number): Promise<string> {
  const { lat, lng } = fromLv95(e, n)
  const commune = await findCommune(lat, lng)
  if (!commune) throw new RiskLookupError('canton lookup failed')
  return commune.canton
}

function cantonCredit(dataset: 'hazards' | 'contamination', canton: string): RiskSourceCredit | null {
  const src = cantonSource(dataset, canton)
  if (!src) return null
  const what = dataset === 'hazards' ? 'hazard map (Gefahrenkarte)' : 'cadastre of contaminated sites'
  return { label: `Canton of ${src.name} — ${what}, via geodienste.ch`, url: src.termsUrl }
}

// ─── natural hazards ─────────────────────────────────────────────────────────

const HAZARD_LAYERS: Record<string, HazardType> = {
  gefahrengebiet_wasser: 'flood',
  gefahrengebiet_ruschtung: 'landslide', // sic: the published layer name
  gefahrengebiet_sturz: 'rockfall',
  gefahrengebiet_lawine: 'avalanche',
}
const SURVEY_LAYER = 'erhebungsgebiet_gefahrenkartierung'

// The survey-status fields that cover each process (MGDM Gefahrenkarten 166.1)
const SURVEY_FIELDS: Record<HazardType, string[]> = {
  flood: ['Erhebungsstand_Überschwemmung', 'Erhebungsstand_Übermurung', 'Erhebungsstand_Ufererosion'],
  landslide: ['Erhebungsstand_permanente_Rutschung', 'Erhebungsstand_spontane_Rutschung', 'Erhebungsstand_Hangmure'],
  rockfall: ['Erhebungsstand_Stein_Blockschlag', 'Erhebungsstand_Fels_Bergsturz'],
  avalanche: ['Erhebungsstand_Fliesslawine', 'Erhebungsstand_Staublawine', 'Erhebungsstand_Schneegleiten'],
}

// Gefahrenstufe values as published. Anything else is ignored, not guessed at.
const ZONES: Record<string, HazardZone> = {
  nicht_gefaehrdet: 'none',
  Restgefaehrdung: 'residual',
  gering: 'low',
  mittel: 'medium',
  erheblich: 'high',
}
const ZONE_RANK: Record<HazardZone, number> = { none: 0, residual: 1, low: 2, medium: 3, high: 4 }

export function zoneToLevel(zone: HazardZone): HazardLevel {
  return zone === 'residual' ? 'none' : zone
}

type Feature = Record<string, string>

/** Parse MapServer's text/plain GetFeatureInfo: Layer 'x' / Feature n: / key = 'value' */
export function parseFeatureInfo(text: string): Map<string, Feature[]> {
  const layers = new Map<string, Feature[]>()
  let current: Feature[] | null = null
  let feature: Feature | null = null
  for (const line of text.split('\n')) {
    const layer = line.match(/^Layer '([^']+)'/)
    if (layer) {
      current = []
      layers.set(layer[1], current)
      feature = null
      continue
    }
    if (/^\s+Feature \d+:/.test(line) && current) {
      feature = {}
      current.push(feature)
      continue
    }
    const kv = line.match(/^\s+([^=]+?) = '(.*)'\s*$/)
    if (kv && feature) feature[kv[1]] = kv[2]
  }
  return layers
}

async function lookupHazards(e: number, n: number): Promise<HazardResult> {
  const canton = await resolveCanton(e, n)
  const src = cantonSource('hazards', canton)
  if (!src) {
    return {
      status: 'unavailable_canton',
      canton,
      cantonName: HAZARD_EXCLUDED[canton]?.name,
      level: null,
      zone: null,
      processes: [],
      credits: [],
      message: HAZARD_EXCLUDED[canton]?.reason,
    }
  }

  const layers = [...Object.keys(HAZARD_LAYERS), SURVEY_LAYER].join(',')
  // 10 m box sampled at its centre pixel (0.1 m/px), so the hit is the point itself
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetFeatureInfo',
    LAYERS: layers,
    QUERY_LAYERS: layers,
    CRS: 'EPSG:2056',
    BBOX: `${e - 5},${n - 5},${e + 5},${n + 5}`,
    WIDTH: '101',
    HEIGHT: '101',
    I: '50',
    J: '50',
    // text/plain carries attributes only; GML would include megabytes of geometry
    INFO_FORMAT: 'text/plain',
    FEATURE_COUNT: '50',
    STYLES: '',
    FORMAT: 'image/png',
  })
  await spend('wms')
  const text = await (await fetchWithTimeout(`${HAZARD_WMS}?${params}`)).text()
  if (!text.includes('GetFeatureInfo results')) throw new RiskLookupError('unexpected GetFeatureInfo response')
  const info = parseFeatureInfo(text)

  // Only this canton's features count (a point near a border can hit another's)
  const ofCanton = (f: Feature) => (f.Kanton ?? f.Datenherr) === canton
  const survey = (info.get(SURVEY_LAYER) ?? []).filter(ofCanton)

  const processes: HazardProcess[] = (Object.entries(HAZARD_LAYERS) as Array<[string, HazardType]>).map(([layer, type]) => {
    let worst: HazardZone | null = null
    for (const f of (info.get(layer) ?? []).filter(ofCanton)) {
      const zone = ZONES[f.Gefahrenstufe]
      if (!zone) {
        if (f.Gefahrenstufe) console.log(`[risks] unknown Gefahrenstufe '${f.Gefahrenstufe}' in ${canton}`)
        continue
      }
      if (worst === null || ZONE_RANK[zone] > ZONE_RANK[worst]) worst = zone
    }
    if (worst) return { type, zone: worst }
    // No hazard area here: "none" only if the canton actually assessed this process here
    const assessed = survey.some(f => SURVEY_FIELDS[type].some(k => f[k]?.startsWith('beurteilt')))
    return { type, zone: assessed ? 'none' : 'not_mapped' }
  })

  const mapped = processes.filter((p): p is { type: HazardType; zone: HazardZone } => p.zone !== 'not_mapped')
  const credit = cantonCredit('hazards', canton)!
  if (mapped.length === 0) {
    return { status: 'not_mapped', canton, cantonName: src.name, level: null, zone: null, processes, credits: [credit] }
  }
  const zone = mapped.reduce<HazardZone>((w, p) => (ZONE_RANK[p.zone] > ZONE_RANK[w] ? p.zone : w), 'none')
  return { status: 'ok', canton, cantonName: src.name, level: zoneToLevel(zone), zone, processes, credits: [credit] }
}

// ─── contaminated sites ──────────────────────────────────────────────────────

type Ring = Array<[number, number]> // LV95 [e, n]
interface RawSite {
  id: string
  typeLabel: string
  statusLabel: string
  authority: string
  rings: Ring[] // empty for point sites
  point: [number, number]
}

/** Classify by the official German wording, which both the cantonal and federal cadastres use */
export function classifyStatus(text: string): ContaminatedSiteStatus {
  const t = text.toLowerCase()
  // Order matters: "weder überwachungs- noch sanierungsbedürftig" contains both later keywords
  if (t.includes('weder')) return 'no_action_needed'
  if (t.includes('keine schädlichen')) return 'no_harm_expected'
  if (t.includes('noch nicht definiert')) return 'not_yet_assessed'
  if (t.includes('untersuchungsbedürftig')) return 'investigation_needed'
  if (t.includes('überwachungsbedürftig')) return 'monitoring_needed'
  if (t.includes('sanierungsbedürftig')) return 'remediation_needed'
  return 'other'
}

export function classifyType(text: string): ContaminatedSiteType {
  const t = text.toLowerCase()
  if (t.includes('ablagerung')) return 'landfill'
  // Before 'schiess': "Betriebsstandort (ohne Schiessanlagen oder Schiessplätze)"
  if (t.includes('betrieb')) return 'industrial'
  if (t.includes('schiess')) return 'shooting_range'
  if (t.includes('unfall')) return 'accident'
  return 'other'
}

function segmentDistance(px: number, py: number, [ax, ay]: [number, number], [bx, by]: [number, number]): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function insideRing(px: number, py: number, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Metres from (e, n) to a site: 0 inside its outline (outer ring minus holes) */
export function distanceToSite(e: number, n: number, site: Pick<RawSite, 'rings' | 'point'>): number {
  if (site.rings.length === 0) return Math.hypot(e - site.point[0], n - site.point[1])
  // rings[0] of each polygon is the outer ring; for multipolygons every ring is
  // passed through, and even-odd counting across all of them handles holes
  let inside = false
  let best = Infinity
  for (const ring of site.rings) {
    if (insideRing(e, n, ring)) inside = !inside
    for (let i = 1; i < ring.length; i++) best = Math.min(best, segmentDistance(e, n, ring[i - 1], ring[i]))
  }
  return inside ? 0 : best
}

type GeoJsonGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'MultiPoint'; coordinates: Array<[number, number]> }
  | { type: 'Polygon'; coordinates: Ring[] }
  | { type: 'MultiPolygon'; coordinates: Ring[][] }

function geometryParts(g: GeoJsonGeometry | null | undefined): { rings: Ring[]; point: [number, number] } | null {
  if (!g) return null
  if (g.type === 'Point') return { rings: [], point: g.coordinates }
  if (g.type === 'MultiPoint' && g.coordinates.length) return { rings: [], point: g.coordinates[0] }
  const rings = g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? g.coordinates.flat() : []
  if (!rings.length || !rings[0].length) return null
  const outer = rings[0]
  const point: [number, number] = [
    outer.reduce((s, c) => s + c[0], 0) / outer.length,
    outer.reduce((s, c) => s + c[1], 0) / outer.length,
  ]
  return { rings, point }
}

async function cantonalSites(e: number, n: number): Promise<RawSite[]> {
  const r = CONTAMINATION_RADIUS_M + 20
  const params = new URLSearchParams({
    f: 'json',
    limit: '100',
    crs: LV95_CRS,
    'bbox-crs': LV95_CRS,
    bbox: `${e - r},${n - r},${e + r},${n + r}`,
  })
  const sites: RawSite[] = []
  for (const collection of ['belastete_standorte_flaechen', 'belastete_standorte_punkte']) {
    await spend('features')
    const data = (await (await fetchWithTimeout(`${KBS_OGCAPI}/${collection}/items?${params}`)).json()) as {
      features?: Array<{ geometry: GeoJsonGeometry; properties: Record<string, unknown> }>
    }
    if (!Array.isArray(data.features)) throw new RiskLookupError(`unexpected ${collection} response`)
    for (const f of data.features) {
      const p = f.properties
      const canton = String(p.kanton ?? '')
      // Discard sites from cantons whose terms we don't meet (border areas)
      if (!cantonSource('contamination', canton)) continue
      const parts = geometryParts(f.geometry)
      if (!parts) continue
      sites.push({
        id: String(p.katasternummer ?? ''),
        typeLabel: String(p.standorttyp ?? ''),
        statusLabel: String(p.statusaltlv ?? ''),
        authority: canton,
        ...parts,
      })
    }
  }
  return sites
}

const FEDERAL_LAYERS: Record<string, string> = {
  'ch.bav.kataster-belasteter-standorte-oev': 'Federal Office of Transport (FOT)',
  'ch.bazl.kataster-belasteter-standorte-zivilflugplaetze': 'Federal Office of Civil Aviation (FOCA)',
  'ch.vbs.kataster-belasteter-standorte-militaer': 'Federal Department of Defence (DDPS)',
}

async function federalSites(e: number, n: number): Promise<RawSite[]> {
  // identify's tolerance is in pixels: 1000 m over 100 px = 10 m/px, so 12 px ≈ 120 m;
  // exact distances are computed below
  const params = new URLSearchParams({
    geometryType: 'esriGeometryPoint',
    geometry: `${e},${n}`,
    sr: '2056',
    tolerance: '12',
    mapExtent: `${e - 500},${n - 500},${e + 500},${n + 500}`,
    imageDisplay: '100,100,96',
    returnGeometry: 'true',
    geometryFormat: 'geojson',
    layers: `all:${Object.keys(FEDERAL_LAYERS).join(',')}`,
    lang: 'de',
  })
  const data = (await (await fetchWithTimeout(`${IDENTIFY}?${params}`)).json()) as {
    results?: Array<{ layerBodId: string; geometry: GeoJsonGeometry; properties: Record<string, unknown> }>
  }
  if (!Array.isArray(data.results)) throw new RiskLookupError('unexpected identify response')
  const sites: RawSite[] = []
  for (const r of data.results) {
    const parts = geometryParts(r.geometry)
    if (!parts) continue
    sites.push({
      id: String(r.properties.katasternummer ?? ''),
      typeLabel: String(r.properties.standorttyp_de ?? ''),
      statusLabel: String(r.properties.statusaltlv_de ?? ''),
      authority: FEDERAL_LAYERS[r.layerBodId] ?? 'Federal cadastre',
      ...parts,
    })
  }
  return sites
}

async function lookupContamination(e: number, n: number): Promise<ContaminationResult> {
  const canton = await resolveCanton(e, n)
  const src = cantonSource('contamination', canton)
  if (!src) {
    return {
      status: 'unavailable_canton',
      canton,
      cantonName: CONTAMINATION_EXCLUDED[canton]?.name,
      sites: [],
      radiusM: CONTAMINATION_RADIUS_M,
      credits: [],
      message: CONTAMINATION_EXCLUDED[canton]?.reason,
    }
  }

  const [cantonal, federal] = await Promise.all([cantonalSites(e, n), federalSites(e, n)])

  const credits: RiskSourceCredit[] = []
  const sites: ContaminatedSite[] = []
  for (const raw of [...cantonal, ...federal]) {
    const d = distanceToSite(e, n, raw)
    if (d > CONTAMINATION_RADIUS_M) continue
    const { lat: sLat, lng: sLng } = fromLv95(raw.point[0], raw.point[1])
    sites.push({
      id: raw.id,
      type: classifyType(raw.typeLabel),
      typeLabel: raw.typeLabel,
      status: classifyStatus(raw.statusLabel),
      statusLabel: raw.statusLabel,
      distanceM: Math.round(d),
      onSite: d === 0,
      authority: raw.authority,
      lat: sLat,
      lng: sLng,
      // Outer ring only, for drawing; small sites, so no simplification needed
      polygon: raw.rings[0]?.map(([re, rn]) => {
        const p = fromLv95(re, rn)
        return [p.lat, p.lng] as [number, number]
      }),
    })
  }
  sites.sort((a, b) => a.distanceM - b.distanceM)

  // Credit every source whose data is shown, plus the address's own canton
  for (const c of new Set([canton, ...sites.map(s => s.authority)])) {
    const credit = cantonCredit('contamination', c)
    if (credit) credits.push(credit)
  }
  const federalShown = new Set(sites.map(s => s.authority).filter(a => !cantonSource('contamination', a)))
  for (const office of federalShown) {
    credits.push({ label: `${office} — federal cadastre of contaminated sites, via geo.admin.ch`, url: 'https://www.geo.admin.ch/en/general-terms-of-use-fsdi' })
  }

  return { status: 'ok', canton, cantonName: src.name, sites, radiusM: CONTAMINATION_RADIUS_M, credits }
}

// ─── cached entry points ─────────────────────────────────────────────────────

// unstable_cache keys on the arguments, so the lookups take LV95 rounded to
// 1 m: the cache is then "per coordinate", not per float-noise variant of it.
const cachedHazards = unstable_cache(lookupHazards, ['risks-hazards-v2'], { revalidate: CACHE_SECONDS })
const cachedContamination = unstable_cache(lookupContamination, ['risks-contamination-v2'], { revalidate: CACHE_SECONDS })

function rounded(lat: number, lng: number): [number, number] {
  const { e, n } = toLv95(lat, lng)
  return [Math.round(e), Math.round(n)]
}

function failed<T extends HazardResult | ContaminationResult>(base: T, err: unknown): T {
  console.log('[risks] lookup failed:', err instanceof Error ? err.message : err)
  return { ...base, status: 'error', message: 'Temporarily unavailable — try again in a minute.' }
}

export async function getHazards(lat: number, lng: number): Promise<HazardResult> {
  try {
    return await cachedHazards(...rounded(lat, lng))
  } catch (err) {
    return failed({ status: 'error', level: null, zone: null, processes: [], credits: [] }, err)
  }
}

export async function getContamination(lat: number, lng: number): Promise<ContaminationResult> {
  try {
    return await cachedContamination(...rounded(lat, lng))
  } catch (err) {
    return failed({ status: 'error', sites: [], radiusM: CONTAMINATION_RADIUS_M, credits: [] }, err)
  }
}
