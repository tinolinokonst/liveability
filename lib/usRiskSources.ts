// Server-side lookups for the US Risks section, the counterpart of the Swiss
// cantonal hazard maps and contaminated-site cadastres (lib/riskSources.ts):
//
// - Flood zone: FEMA National Flood Hazard Layer (the digital FIRMs), point query.
// - National Risk Index: FEMA's composite and per-hazard ratings for the
//   census tract and county, from FEMA's public NRI feature services.
// - Wildfire: annual burn probability from USDA Forest Service Wildfire Risk
//   to Communities, at the ~30 m cell; FEMA's tract wildfire rating for context.
// - EPA sites within 1 mile: Superfund (NPL and non-NPL, from SEMS), Toxics
//   Release Inventory reporters and brownfield properties (ACRES), from the
//   EPA Facility Registry Service — the registry behind Envirofacts.
//
// Every lookup is cached 30 days per rounded coordinate. Failures throw and
// are never cached; each part degrades on its own.
//
// PRIVACY: brownfield properties are registered under whatever the grantee
// calls them, which can be a private owner's name, so their names are never
// stored or shown — only the type, distance, and the link to EPA's record.

import { unstable_cache } from 'next/cache'
import { fetchJson, haversineKm, orError, roundCoord, UsLookupError } from './usUpstream'
import type {
  EpaSite,
  EpaSiteKind,
  FloodRisk,
  NriArea,
  NriHazard,
  NriRating,
  UsEpaSitesResult,
  UsFloodResult,
  UsNriResult,
  UsRisksResult,
  UsWildfireResult,
} from './types'

const CACHE_SECONDS = 30 * 24 * 60 * 60
export const EPA_RADIUS_MILES = 1
const KM_PER_MILE = 1.609344

const NFHL = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer'
const NFHL_ZONES_LAYER = 28 // "Flood Hazard Zones" (S_FLD_HAZ_AR)
const NFHL_PANELS_LAYER = 3 // "FIRM Panels" (S_FIRM_PAN)
const NRI_TRACTS = 'https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Census_Tracts/FeatureServer/0'
const NRI_COUNTIES = 'https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0'
const WRC_BURN_PROBABILITY = 'https://apps.fs.usda.gov/fsgisx01/rest/services/RDW_Wildfire/RMRS_WRC_BurnProbability/ImageServer'
const FRS = 'https://gispub.epa.gov/arcgis/rest/services/OEI/FRS_INTERESTS/MapServer'
const FRS_LAYERS = { acres: 0, sems: 21, semsNpl: 22, tri: 23 } as const

interface ArcGisQuery<A> { features?: Array<{ attributes: A }>; error?: { message?: string } }

function pointQuery(lat: number, lng: number, outFields: string, extra: Record<string, string> = {}): string {
  return new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields,
    returnGeometry: 'false',
    f: 'json',
    ...extra,
  }).toString()
}

async function arcgisFeatures<A>(url: string): Promise<A[]> {
  const data = await fetchJson<ArcGisQuery<A>>(url, { timeoutMs: 15000 })
  if (data.error || !Array.isArray(data.features)) throw new UsLookupError(`ArcGIS: ${data.error?.message ?? 'unexpected response'}`)
  return data.features.map(f => f.attributes)
}

// ─── flood zone (FEMA NFHL) ──────────────────────────────────────────────────

interface FloodZoneAttrs { FLD_ZONE: string | null; ZONE_SUBTY: string | null; SFHA_TF: string | null; STATIC_BFE: number | null }
interface PanelAttrs { FIRM_PAN: string | null; EFF_DATE: number | null }

/** FEMA's own grouping of zone designations */
export function floodRiskOf(zone: string, subtype: string | null): FloodRisk | null {
  const z = zone.trim().toUpperCase()
  const sub = (subtype ?? '').toUpperCase()
  if (/^V/.test(z)) return 'coastal_high'
  if (/^A/.test(z)) return 'high'
  if (z === 'X' || z === 'B' || z === 'C') {
    // Shaded X (formerly B): the 0.2%-annual-chance floodplain, or behind a levee
    if (z === 'B' || sub.includes('0.2 PCT') || sub.includes('LEVEE')) return 'moderate'
    return 'minimal'
  }
  if (z === 'D') return 'undetermined'
  if (z === 'OPEN WATER') return 'water'
  return null
}

const FLOOD_ORDER: FloodRisk[] = ['coastal_high', 'high', 'moderate', 'undetermined', 'water', 'minimal']

async function lookupFlood(lat: number, lng: number): Promise<UsFloodResult> {
  const [zones, panels] = await Promise.all([
    arcgisFeatures<FloodZoneAttrs>(`${NFHL}/${NFHL_ZONES_LAYER}/query?${pointQuery(lat, lng, 'FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE')}`),
    arcgisFeatures<PanelAttrs>(`${NFHL}/${NFHL_PANELS_LAYER}/query?${pointQuery(lat, lng, 'FIRM_PAN,EFF_DATE')}`),
  ])
  const classified = zones
    .filter(z => z.FLD_ZONE)
    .map(z => ({ z, risk: floodRiskOf(z.FLD_ZONE!, z.ZONE_SUBTY) }))
    .filter((c): c is { z: FloodZoneAttrs; risk: FloodRisk } => c.risk !== null)
  // No polygon: no digital flood map here (paper-only maps, or never mapped)
  if (!classified.length) {
    return { status: 'no_data', zone: null, subtype: null, risk: null, sfha: null, bfeFt: null, firmPanel: null, effectiveDate: null }
  }
  // On a zone boundary, report the more hazardous side
  classified.sort((a, b) => FLOOD_ORDER.indexOf(a.risk) - FLOOD_ORDER.indexOf(b.risk))
  const { z, risk } = classified[0]
  const panel = panels.find(p => p.FIRM_PAN)
  return {
    status: 'ok',
    zone: z.FLD_ZONE!.trim(),
    subtype: z.ZONE_SUBTY?.trim() || null,
    risk,
    sfha: z.SFHA_TF === 'T',
    // -9999 is the NFHL's "no BFE" value
    bfeFt: typeof z.STATIC_BFE === 'number' && z.STATIC_BFE > -9000 ? z.STATIC_BFE : null,
    firmPanel: panel?.FIRM_PAN ?? null,
    effectiveDate: panel?.EFF_DATE ? new Date(panel.EFF_DATE).toISOString().slice(0, 10) : null,
  }
}

const cachedFlood = unstable_cache(lookupFlood, ['us-nfhl-v1'], { revalidate: CACHE_SECONDS })

// ─── National Risk Index (FEMA) ──────────────────────────────────────────────

export const NRI_HAZARDS: Record<string, string> = {
  AVLN: 'Avalanche',
  CFLD: 'Coastal flooding',
  CWAV: 'Cold wave',
  DRGT: 'Drought',
  ERQK: 'Earthquake',
  HAIL: 'Hail',
  HWAV: 'Heat wave',
  HRCN: 'Hurricane',
  ISTM: 'Ice storm',
  LNDS: 'Landslide',
  LTNG: 'Lightning',
  IFLD: 'Riverine flooding',
  SWND: 'Strong wind',
  TRND: 'Tornado',
  TSUN: 'Tsunami',
  VLCN: 'Volcanic activity',
  WFIR: 'Wildfire',
  WNTW: 'Winter weather',
}

const REAL_RATINGS: NriRating[] = ['Very High', 'Relatively High', 'Relatively Moderate', 'Relatively Low', 'Very Low']
const NRI_FIELDS = [
  'TRACTFIPS', 'COUNTY', 'COUNTYTYPE', 'STATEABBRV', 'RISK_SCORE', 'RISK_RATNG', 'NRI_VER',
  ...Object.keys(NRI_HAZARDS).flatMap(k => [`${k}_RISKS`, `${k}_RISKR`]),
]

type NriAttrs = Record<string, string | number | null>

function isRating(v: unknown): v is NriRating {
  return typeof v === 'string' && (REAL_RATINGS as string[]).concat(['No Rating', 'Not Applicable', 'Insufficient Data']).includes(v)
}

function nriArea(a: NriAttrs, name: string): NriArea {
  const topHazards: NriHazard[] = Object.entries(NRI_HAZARDS)
    .map(([key, label]) => ({ key, label, rating: a[`${key}_RISKR`], score: a[`${key}_RISKS`] }))
    .filter((h): h is NriHazard => isRating(h.rating) && REAL_RATINGS.includes(h.rating) && typeof h.score === 'number')
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
  return {
    name,
    rating: isRating(a.RISK_RATNG) ? a.RISK_RATNG : 'Insufficient Data',
    score: typeof a.RISK_SCORE === 'number' ? Math.round(a.RISK_SCORE * 10) / 10 : null,
    topHazards,
  }
}

interface NriCached {
  tract: NriArea | null
  county: NriArea | null
  version: string | null
  wildfire: NriRating | null
}

async function lookupNri(lat: number, lng: number): Promise<NriCached> {
  const fields = NRI_FIELDS.join(',')
  const [tracts, counties] = await Promise.all([
    arcgisFeatures<NriAttrs>(`${NRI_TRACTS}/query?${pointQuery(lat, lng, fields)}`),
    arcgisFeatures<NriAttrs>(`${NRI_COUNTIES}/query?${pointQuery(lat, lng, fields.replace('TRACTFIPS,', ''))}`),
  ])
  const t = tracts[0]
  const c = counties[0] ?? t
  const countyName = c ? `${c.COUNTY} ${c.COUNTYTYPE ?? ''}`.trim() + (c.STATEABBRV ? `, ${c.STATEABBRV}` : '') : null
  return {
    tract: t ? nriArea(t, `GEOID ${t.TRACTFIPS}`) : null,
    county: counties[0] && countyName ? nriArea(counties[0], countyName) : null,
    version: (t?.NRI_VER ?? counties[0]?.NRI_VER ?? null) as string | null,
    wildfire: t && isRating(t.WFIR_RISKR) ? t.WFIR_RISKR : null,
  }
}

const cachedNri = unstable_cache(lookupNri, ['us-nri-v2'], { revalidate: CACHE_SECONDS })

// ─── wildfire (USFS Wildfire Risk to Communities) ────────────────────────────

async function lookupBurnProbability(lat: number, lng: number): Promise<number | null> {
  const params = new URLSearchParams({
    geometry: JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } }),
    geometryType: 'esriGeometryPoint',
    returnGeometry: 'false',
    returnCatalogItems: 'false',
    f: 'json',
  })
  const data = await fetchJson<{ value?: string; error?: { message?: string } }>(`${WRC_BURN_PROBABILITY}/identify?${params}`, { timeoutMs: 15000 })
  if (data.error || typeof data.value !== 'string') throw new UsLookupError(`WRC: ${data.error?.message ?? 'unexpected response'}`)
  if (data.value === 'NoData') return null
  const bp = Number(data.value)
  // An annual probability; anything else means the service changed its encoding
  if (!Number.isFinite(bp) || bp < 0 || bp > 1) throw new UsLookupError(`WRC: unexpected value ${data.value}`)
  return bp
}

const cachedBurnProbability = unstable_cache(lookupBurnProbability, ['us-wrc-bp-v1'], { revalidate: CACHE_SECONDS })

// ─── EPA sites (FRS) ─────────────────────────────────────────────────────────

interface FrsAttrs {
  REGISTRY_ID: string | null
  PRIMARY_NAME: string | null
  INTEREST_TYPE: string | null
  ACTIVE_STATUS: string | null
  LATITUDE83: number | null
  LONGITUDE83: number | null
}

type CachedEpaSite = Omit<EpaSite, 'distanceKm'>

function frsUrl(registryId: string): string {
  return `https://frs-public.epa.gov/ords/frs_public2/fii_query_detail.disp_program_facility?p_registry_id=${encodeURIComponent(registryId)}`
}

function epaKind(layer: keyof typeof FRS_LAYERS, interestType: string): EpaSiteKind {
  if (layer === 'acres') return 'brownfield'
  if (layer === 'tri') return 'tri'
  const t = interestType.toUpperCase()
  return t.includes('NPL') && !t.includes('NON-NPL') ? 'superfund_npl' : 'superfund'
}

/** Sites within a slightly larger radius of a rounded point; the exact filter happens per address */
async function lookupEpaSites(lat: number, lng: number): Promise<CachedEpaSite[]> {
  const extra = { distance: String(EPA_RADIUS_MILES + 0.1), units: 'esriSRUnit_StatuteMile' }
  const fields = 'REGISTRY_ID,PRIMARY_NAME,INTEREST_TYPE,ACTIVE_STATUS,LATITUDE83,LONGITUDE83'
  const layers = Object.keys(FRS_LAYERS) as Array<keyof typeof FRS_LAYERS>
  const results = await Promise.all(layers.map(l => arcgisFeatures<FrsAttrs>(`${FRS}/${FRS_LAYERS[l]}/query?${pointQuery(lat, lng, fields, extra)}`)))

  const sites = new Map<string, CachedEpaSite>()
  layers.forEach((layer, i) => {
    for (const a of results[i]) {
      if (!a.REGISTRY_ID || typeof a.LATITUDE83 !== 'number' || typeof a.LONGITUDE83 !== 'number') continue
      const kind = epaKind(layer, a.INTEREST_TYPE ?? '')
      const key = `${a.REGISTRY_ID}:${kind}`
      // The SEMS and SEMS_NPL layers overlap; one entry per site and kind
      if (sites.has(key)) continue
      sites.set(key, {
        registryId: a.REGISTRY_ID,
        kind,
        name: kind === 'brownfield' ? null : a.PRIMARY_NAME?.trim() || null,
        // A TRI record's "ACTIVE" describes the registry entry, not the plant
        // (long-closed factories read ACTIVE), so it's left out
        status: kind === 'brownfield' || kind === 'tri' ? null : a.ACTIVE_STATUS?.trim() || null,
        lat: a.LATITUDE83,
        lng: a.LONGITUDE83,
        url: frsUrl(a.REGISTRY_ID),
      })
    }
  })
  // An NPL site also listed as plain SEMS is the NPL entry
  for (const [key, s] of sites) {
    if (s.kind === 'superfund' && sites.has(`${s.registryId}:superfund_npl`)) sites.delete(key)
  }
  return [...sites.values()]
}

const cachedEpaSites = unstable_cache(lookupEpaSites, ['us-epa-frs-v2'], { revalidate: CACHE_SECONDS })

const KIND_ORDER: EpaSiteKind[] = ['superfund_npl', 'superfund', 'brownfield', 'tri']

function epaResult(cached: CachedEpaSite[], lat: number, lng: number): UsEpaSitesResult {
  const radiusKm = EPA_RADIUS_MILES * KM_PER_MILE
  const sites = cached
    .map(s => ({ ...s, distanceKm: Math.round(haversineKm(lat, lng, s.lat, s.lng) * 1000) / 1000 }))
    .filter(s => s.distanceKm <= radiusKm)
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.distanceKm - b.distanceKm)
  const counts: Record<EpaSiteKind, number> = { superfund_npl: 0, superfund: 0, tri: 0, brownfield: 0 }
  for (const s of sites) counts[s.kind]++
  return { status: 'ok', radiusMiles: EPA_RADIUS_MILES, sites, counts }
}

// ─── all risks ───────────────────────────────────────────────────────────────

export async function getUsRisks(lat: number, lng: number): Promise<UsRisksResult> {
  const [flood, nri, bp, epa] = await Promise.all([
    orError(() => cachedFlood(roundCoord(lat, 5), roundCoord(lng, 5)), null, 'us-nfhl'),
    orError(() => cachedNri(roundCoord(lat), roundCoord(lng)), null, 'us-nri'),
    orError(async () => ({ value: await cachedBurnProbability(roundCoord(lat), roundCoord(lng)) }), null, 'us-wrc'),
    orError(() => cachedEpaSites(roundCoord(lat, 3), roundCoord(lng, 3)), null, 'us-epa'),
  ])

  const nriResult: UsNriResult = nri
    ? { status: nri.tract || nri.county ? 'ok' : 'no_data', tract: nri.tract, county: nri.county, version: nri.version }
    : { status: 'error', tract: null, county: null, version: null }

  const wildfire: UsWildfireResult = {
    status: !bp ? 'error' : bp.value === null ? 'no_data' : 'ok',
    burnProbability: bp?.value ?? null,
    nriRating: nri?.wildfire ?? null,
  }

  return {
    flood: flood ?? { status: 'error', zone: null, subtype: null, risk: null, sfha: null, bfeFt: null, firmPanel: null, effectiveDate: null },
    nri: nriResult,
    wildfire,
    epa: epa ? epaResult(epa, lat, lng) : { status: 'error', radiusMiles: EPA_RADIUS_MILES, sites: [], counts: { superfund_npl: 0, superfund: 0, tri: 0, brownfield: 0 } },
  }
}
