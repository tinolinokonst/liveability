// US transportation noise from the BTS National Transportation Noise Map
// (2020 release): modeled 24-hour LAeq from road, rail and aviation.
//
// BTS publishes it only as pre-rendered, classified map tiles (TilesOnly
// MapServers on geo.dot.gov, no identify), so the band at an address is read
// from the tile pixel it falls in. The tiles are classified with exact
// colours (no anti-aliasing; checked against the service legend), so every
// pixel maps to exactly one of the legend's dB bands, and a transparent one
// means below the map's 45 dBA floor. Any colour outside the legend is a
// failure, never a guess. The deepest cached level (12, ~30 m per pixel at
// US latitudes) matches the model's native 30 m grid.
//
// The data are static, so results are cached 30 days per tile pixel.

import { unstable_cache } from 'next/cache'
import { decodePng } from './png'
import { fetchUpstream, orError, usRegion, UsLookupError, type UsRegion } from './usUpstream'
import type { NoiseBand, NoiseMode, UsNoiseResult } from './types'

const BASE = 'https://geo.dot.gov/server/rest/services/Hosted'
const ZOOM = 12
const CACHE_SECONDS = 30 * 24 * 60 * 60

// Service names per region; Hawaii has no rail layer (and no rail network to model)
const SERVICES: Record<UsRegion, { combined: string } & Record<NoiseMode, string | null>> = {
  conus: { combined: 'NTAD_Noise_2020_CONUS_Aviation_Road_Rail', road: 'NTAD_Noise_2020_CONUS_Road', rail: 'NTAD_Noise_2020_CONUS_Rail', aviation: 'NTAD_Noise_2020_CONUS_Aviation' },
  alaska: { combined: 'NTAD_Noise_2020_Alaska_Aviation_Road_Rail', road: 'NTAD_Noise_2020_Alaska_Road', rail: 'NTAD_Noise_2020_Alaska_Rail', aviation: 'NTAD_Noise_2020_Alaska_Aviation' },
  hawaii: { combined: 'NTAD_Noise_2020_Hawaii_Aviation_Road', road: 'NTAD_Noise_2020_Hawaii_Road', rail: null, aviation: 'NTAD_Noise_2020_Hawaii_Aviation' },
}

// The service legend (layer 3, "Image"), colour → band
const LEGEND: Record<string, NoiseBand> = {
  '255,193,7': '45_50',
  '255,128,0': '50_55',
  '255,0,0': '55_60',
  '255,51,153': '60_70',
  '163,0,204': '70_80',
  '82,0,204': '80_90',
  '0,0,255': 'above_90',
}

/** Band midpoints, for the score */
const BAND_DB: Record<NoiseBand, number> = {
  below_45: 42.5, '45_50': 47.5, '50_55': 52.5, '55_60': 57.5, '60_70': 65, '70_80': 75, '80_90': 85, above_90: 92.5,
}

// Same scale as the Swiss sonBASE score (app/api/noise): 45 dB or less → 100,
// 75 dB or more → 0. Below the map's floor scores 95 rather than 100: the
// model leaves out local sources (a busy side street, a nearby rail yard).
export function scoreForNoiseBand(band: NoiseBand): number {
  if (band === 'below_45') return 95
  return Math.round(Math.max(0, Math.min(100, ((75 - BAND_DB[band]) * 100) / 30)))
}

function tilePixel(lat: number, lng: number): { x: number; y: number; px: number; py: number } {
  const n = 2 ** ZOOM
  const fx = ((lng + 180) / 360) * n
  const rad = (lat * Math.PI) / 180
  const fy = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n
  return { x: Math.floor(fx), y: Math.floor(fy), px: Math.floor((fx % 1) * 256), py: Math.floor((fy % 1) * 256) }
}

async function lookupBand(service: string, x: number, y: number, px: number, py: number): Promise<NoiseBand> {
  const res = await fetchUpstream(`${BASE}/${service}/MapServer/tile/${ZOOM}/${y}/${x}`)
  if (!res.headers.get('content-type')?.includes('image/png')) throw new UsLookupError('noise tile: not a PNG')
  let rgba: [number, number, number, number]
  try {
    const png = decodePng(Buffer.from(await res.arrayBuffer()))
    rgba = png.pixel(px, py)
  } catch (err) {
    throw new UsLookupError(`noise tile: ${err instanceof Error ? err.message : 'decode failed'}`)
  }
  if (rgba[3] === 0) return 'below_45'
  const band = LEGEND[rgba.slice(0, 3).join(',')]
  if (!band) throw new UsLookupError(`noise tile: colour ${rgba.join(',')} is not in the legend`)
  return band
}

const cachedBand = unstable_cache(lookupBand, ['us-bts-noise-v1'], { revalidate: CACHE_SECONDS })

export async function getUsNoise(lat: number, lng: number): Promise<UsNoiseResult> {
  const services = SERVICES[usRegion(lat, lng)]
  const { x, y, px, py } = tilePixel(lat, lng)
  const band = (service: string | null) =>
    service ? orError(() => cachedBand(service, x, y, px, py), null, 'us-noise') : Promise.resolve(null)

  const [combined, road, rail, aviation] = await Promise.all([
    band(services.combined), band(services.road), band(services.rail), band(services.aviation),
  ])
  const modes = { road, rail, aviation }
  if (!combined) {
    return { status: 'error', band: null, score: null, modes, message: 'Noise data is temporarily unavailable.' }
  }
  return { status: 'ok', band: combined, score: scoreForNoiseBand(combined), modes }
}
