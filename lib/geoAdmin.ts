// Server-side helpers for the Swiss federal geodata infrastructure (geo.admin.ch).
// Uses two services:
//  - WMS GetFeatureInfo for raster layers (BAFU air quality + sonBASE noise), which
//    returns the pixel value at a coordinate.
//  - The api3.geo.admin.ch identify endpoint for vector layers (swisstopo boundaries).
// Both are public, key-free federal services. swisstopo requires source attribution
// wherever its data is shown ("Source: Federal Office of Topography swisstopo").

const WMS_BASE = 'https://wms.geo.admin.ch/'
const IDENTIFY_BASE = 'https://api3.geo.admin.ch/rest/services/api/MapServer/identify'
const TIMEOUT_MS = 8000

async function fetchJsonWithTimeout(url: string): Promise<unknown | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 86400 } })
    if (!res.ok) {
      console.log(`[geoAdmin] fetch failed (${res.status}): ${url.slice(0, 120)}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.log('[geoAdmin] fetch error:', err instanceof Error ? err.message : err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export interface WmsPointResult {
  ok: boolean
  value: number | null // null with ok:true means the layer has no data at this point
}

/**
 * Sample a raster layer's value at a WGS84 coordinate via WMS GetFeatureInfo.
 */
export async function wmsPointValue(layer: string, lat: number, lng: number): Promise<WmsPointResult> {
  const d = 0.0005
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetFeatureInfo',
    LAYERS: layer,
    QUERY_LAYERS: layer,
    CRS: 'EPSG:4326',
    BBOX: `${lat - d},${lng - d},${lat + d},${lng + d}`,
    WIDTH: '100',
    HEIGHT: '100',
    I: '50',
    J: '50',
    INFO_FORMAT: 'application/json',
    FORMAT: 'image/png',
    STYLES: '',
  })

  const data = await fetchJsonWithTimeout(`${WMS_BASE}?${params.toString()}`)
  if (!data || typeof data !== 'object') return { ok: false, value: null }

  const features = (data as { features?: Array<{ properties?: Record<string, unknown> }> }).features
  if (!Array.isArray(features) || features.length === 0) return { ok: true, value: null }

  const raw = features[0]?.properties?.value_0
  const num = Number(raw)
  return { ok: true, value: Number.isFinite(num) ? num : null }
}

/**
 * Identify the vector feature of a layer at a WGS84 coordinate.
 * Returns the attributes of the first matching feature, or null.
 */
export async function identifyFeature(
  layer: string,
  lat: number,
  lng: number,
  timeInstant?: number
): Promise<Record<string, unknown> | null> {
  const params = new URLSearchParams({
    geometryType: 'esriGeometryPoint',
    geometry: `${lng},${lat}`,
    sr: '4326',
    tolerance: '0',
    mapExtent: `${lng - 0.05},${lat - 0.05},${lng + 0.05},${lat + 0.05}`,
    imageDisplay: '100,100,96',
    returnGeometry: 'false',
    layers: `all:${layer}`,
  })
  if (timeInstant) params.set('timeInstant', String(timeInstant))

  const data = await fetchJsonWithTimeout(`${IDENTIFY_BASE}?${params.toString()}`)
  if (!data || typeof data !== 'object') return null

  const results = (data as { results?: Array<{ attributes?: Record<string, unknown> }> }).results
  if (!Array.isArray(results) || results.length === 0) return null
  return results[0]?.attributes ?? null
}

/**
 * Resolve the Swiss commune (Gemeinde) containing a coordinate.
 * Data: swissBOUNDARIES3D — Source: Federal Office of Topography swisstopo.
 */
export async function findCommune(lat: number, lng: number): Promise<{
  commune: string
  bfsNumber: number
  canton: string
} | null> {
  const attrs = await identifyFeature(
    'ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill',
    lat,
    lng,
    new Date().getFullYear()
  )
  if (!attrs) return null

  const commune = typeof attrs.gemname === 'string' ? attrs.gemname : null
  const bfsNumber = Number(attrs.gde_nr)
  const canton = typeof attrs.kanton === 'string' ? attrs.kanton : null

  if (!commune || !canton || !Number.isFinite(bfsNumber)) return null
  return { commune, bfsNumber, canton }
}
