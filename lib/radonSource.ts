// Server-side radon lookup: geo.admin.ch identify on ch.bag.radonkarte.
//
// Cached per 1 km pixel for 30 days. The pixels sit on the LV95 kilometre
// grid with their east edges at …975 m, so an address maps to its pixel with
// plain arithmetic, and the pixel is always queried at its centre — never
// near an edge where the ~1 m coordinate approximation could pick a neighbour.

import { unstable_cache } from 'next/cache'
import { fromLv95, toLv95 } from './lv95'
import { radonBand, radonConfidence, RadonResult } from './radon'

const IDENTIFY = 'https://api3.geo.admin.ch/rest/services/api/MapServer/identify'
const LAYER = 'ch.bag.radonkarte'
const CACHE_SECONDS = 30 * 24 * 60 * 60
const TIMEOUT_MS = 8000
const EAST_OFFSET = 975

function pixelOf(lat: number, lng: number): [number, number] {
  const { e, n } = toLv95(lat, lng)
  return [Math.floor((e - EAST_OFFSET) / 1000), Math.floor(n / 1000)]
}

async function lookupPixel(px: number, py: number): Promise<RadonResult> {
  const e = px * 1000 + EAST_OFFSET + 500
  const n = py * 1000 + 500
  const params = new URLSearchParams({
    geometryType: 'esriGeometryPoint',
    geometry: `${e},${n}`,
    sr: '2056',
    tolerance: '0',
    mapExtent: `${e - 1000},${n - 1000},${e + 1000},${n + 1000}`,
    imageDisplay: '100,100,96',
    returnGeometry: 'true',
    geometryFormat: 'geojson',
    layers: `all:${LAYER}`,
  })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let data: { results?: Array<{ properties: Record<string, unknown>; geometry: { type: string; coordinates: number[][][] } }> }
  try {
    const res = await fetch(`${IDENTIFY}?${params}`, { signal: controller.signal, cache: 'no-store' })
    // Throwing keeps failures out of the cache
    if (!res.ok) throw new Error(`identify ${res.status}`)
    data = await res.json()
  } finally {
    clearTimeout(timeout)
  }
  if (!Array.isArray(data.results)) throw new Error('unexpected identify response')

  const hit = data.results[0]
  const probability = hit?.properties.probability_prozent
  const confidence = hit?.properties.confidence
  // Outside the map (lakes, abroad) or a null value: no data — never read as 0 %
  if (!hit || typeof probability !== 'number' || typeof confidence !== 'number') {
    return { status: 'no_data', probability: null, band: null, confidence: null }
  }
  const ring = hit.geometry.type === 'Polygon' ? hit.geometry.coordinates[0] : []
  return {
    status: 'ok',
    probability,
    band: radonBand(probability),
    confidence: radonConfidence(confidence),
    // sr=2056 means LV95 coordinates back; the map wants lat/lng
    pixel: ring.map(([pe, pn]) => {
      const p = fromLv95(pe, pn)
      return [p.lat, p.lng] as [number, number]
    }),
  }
}

const cachedPixel = unstable_cache(lookupPixel, ['radon-pixel-v1'], { revalidate: CACHE_SECONDS })

export async function getRadon(lat: number, lng: number): Promise<RadonResult> {
  try {
    return await cachedPixel(...pixelOf(lat, lng))
  } catch (err) {
    console.log('[radon] lookup failed:', err instanceof Error ? err.message : err)
    return { status: 'error', probability: null, band: null, confidence: null }
  }
}
