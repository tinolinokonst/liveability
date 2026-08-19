import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'
import { wmsPointValue } from '@/lib/geoAdmin'

// BAFU annual air pollution modeling layers (immission maps), sampled at the
// exact coordinate via WMS GetFeatureInfo. Values are µg/m³.
const LAYERS = {
  pm25: 'ch.bafu.luftreinhaltung-feinstaub_pm2_5',
  pm10: 'ch.bafu.luftreinhaltung-feinstaub_pm10',
  no2: 'ch.bafu.luftreinhaltung-stickstoffdioxid',
  o3: 'ch.bafu.luftreinhaltung-ozon',
}

// Swiss Ordinance on Air Pollution Control (OAPC/LRV) limit values, µg/m³.
// PM2.5/PM10/NO2: annual mean. O3: 98th percentile of ½h means (the layer's unit).
const LIMITS = { pm25: 10, pm10: 20, no2: 30, o3: 100 }

// Weighted composite of pollutant-to-limit ratios, scaled so that "at the Swiss
// limit across the board" lands at an index of 50 (the Good/Moderate boundary,
// matching the thresholds used client-side).
function computeIndex(r: { pm25: number | null; pm10: number | null; no2: number | null; o3: number | null }): number | null {
  const parts: Array<[number, number]> = [] // [ratio, weight]
  if (r.pm25 !== null) parts.push([r.pm25 / LIMITS.pm25, 0.30])
  if (r.no2 !== null) parts.push([r.no2 / LIMITS.no2, 0.25])
  if (r.o3 !== null) parts.push([r.o3 / LIMITS.o3, 0.25])
  if (r.pm10 !== null) parts.push([r.pm10 / LIMITS.pm10, 0.20])
  if (parts.length === 0) return null

  const totalW = parts.reduce((s, [, w]) => s + w, 0)
  const weighted = parts.reduce((s, [ratio, w]) => s + ratio * w, 0) / totalW
  return Math.round(weighted * 50)
}

function categoryFor(aqi: number): string {
  if (aqi > 200) return 'Very Unhealthy'
  if (aqi > 150) return 'Unhealthy'
  if (aqi > 100) return 'Unhealthy for Sensitive Groups'
  if (aqi > 50) return 'Moderate'
  return 'Good'
}

// Map an AQI onto the 0-100 score the cards render.
//
// A flat `100 - aqi` looked reasonable but put the two labels on the card in
// direct conflict: an AQI of 43 is officially "Good", yet scored 57, which the
// UI's 70/40 thresholds call "Fair" — so the same card read "Fair" in its badge
// and "Good" in its subtitle. This lines the two scales up at their boundaries,
// so an AQI band and the score band always agree:
//   AQI   0 -> 100 |  AQI  50 (Good/Moderate)      -> 70 (the "Good" cutoff)
//   AQI 100 ->  40 (the "Fair" cutoff)             |  AQI 200 -> 0
function scoreForAqi(aqi: number): number {
  const raw =
    aqi <= 50 ? 100 - aqi * 0.6
    : aqi <= 100 ? 70 - (aqi - 50) * 0.6
    : 40 - (aqi - 100) * 0.4
  // Floor rather than round: at AQI 101 rounding lifts 39.6 back to 40, which is
  // exactly the "Fair" cutoff, so the first Unhealthy-for-Sensitive reading would
  // still have shown a Fair badge.
  return Math.max(0, Math.min(100, Math.floor(raw)))
}

function buildResponse(aqi: number, source: string, pollutants?: Record<string, number | null>) {
  const category = categoryFor(aqi)
  const score = scoreForAqi(aqi)
  return {
    aqi,
    category,
    score,
    source,
    ...(pollutants ? { pollutants } : {}),
    available: true,
    // Kept for backward compatibility with older clients/saved payload readers
    current: { us_aqi: aqi },
  }
}

async function fetchOpenMeteoFallback(lat: number, lng: number) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return null
  const data = await res.json()
  const aqi = data?.current?.us_aqi
  if (typeof aqi !== 'number') return null
  return buildResponse(Math.round(aqi), 'Open-Meteo Air Quality API')
}

export async function GET(request: NextRequest) {
  const guard = await guardRequest('airquality', 60, 3600)
  if ('response' in guard) return guard.response

  const searchParams = request.nextUrl.searchParams
  const coords = parseCoords(searchParams.get('lat'), searchParams.get('lng'))

  if (!coords) {
    return NextResponse.json({ error: 'Valid Switzerland lat and lng are required' }, { status: 400 })
  }

  // Primary: BAFU annual air pollution modeling sampled at the coordinate
  const [pm25, pm10, no2, o3] = await Promise.all([
    wmsPointValue(LAYERS.pm25, coords.lat, coords.lng),
    wmsPointValue(LAYERS.pm10, coords.lat, coords.lng),
    wmsPointValue(LAYERS.no2, coords.lat, coords.lng),
    wmsPointValue(LAYERS.o3, coords.lat, coords.lng),
  ])

  const values = {
    pm25: pm25.ok ? pm25.value : null,
    pm10: pm10.ok ? pm10.value : null,
    no2: no2.ok ? no2.value : null,
    o3: o3.ok ? o3.value : null,
  }

  const index = computeIndex(values)
  if (index !== null) {
    return NextResponse.json(
      buildResponse(index, 'Swiss Federal Office for the Environment (BAFU), annual air quality modeling', values)
    )
  }

  // Fallback: Open-Meteo real-time US AQI
  console.log('[airquality] BAFU layers returned no data, falling back to Open-Meteo')
  const fallback = await fetchOpenMeteoFallback(coords.lat, coords.lng)
  if (fallback) return NextResponse.json(fallback)

  return NextResponse.json({ error: 'AQI fetch failed' }, { status: 502 })
}
