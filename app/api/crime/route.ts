import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'

// Columbus does not currently publish a queryable point-level crime incident layer on
// gis.columbus.gov, maps2.columbus.gov, or opendata.columbus.gov (PublicSafety/MapServer only
// exposes precincts, zones, cruiser districts and station locations; CPD_Density is a
// tiles-only raster with no query capability). This endpoint is kept for if/when CPD
// publishes one; until then the request fails and the fallback below is returned.
const CRIME_LAYER_URL =
  'https://gis.columbus.gov/arcgis/rest/services/PublicSafety/PoliceIncidents/MapServer/0/query'

const TIMEOUT_MS = 10000
const FALLBACK = { incidentCount: 0, topIncidentTypes: [], safetyScore: 60, note: 'data unavailable' }

// FBI Crime Data Explorer API - state-level violent crime rate trends, used as secondary
// context alongside the local incident data above. Gated on NEXT_PUBLIC_DATA_GOV_API_KEY;
// returns undefined if the key is missing or the request fails so callers can omit it.
const FBI_STATE_ABBR = 'OH'

async function fetchStateCrimeContext() {
  const apiKey = process.env.NEXT_PUBLIC_DATA_GOV_API_KEY
  if (!apiKey) return undefined

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const url = `https://api.usa.gov/crime/fbi/cde/summarized/state/${FBI_STATE_ABBR}/violent-crime?from=2018&to=2022&API_KEY=${apiKey}`
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 86400 } })

    if (!res.ok) {
      console.log(`FBI Crime Data API fetch failed: status ${res.status}`)
      return undefined
    }

    const data = await res.json()
    const results = data?.results ?? data?.data
    if (!Array.isArray(results) || results.length === 0) {
      console.log('FBI Crime Data API returned no results')
      return undefined
    }

    const latest = results[results.length - 1]
    const rate = latest?.rate ?? latest?.crime_rate ?? null
    const year = latest?.year ?? latest?.data_year

    if (typeof rate !== 'number') return undefined

    return { state: 'Ohio', rate, year, available: true }
  } catch (err) {
    console.log('FBI Crime Data API fetch error:', err)
    return undefined
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: NextRequest) {
  const guard = await guardRequest('crime', 60, 3600)
  if ('response' in guard) return guard.response

  const searchParams = request.nextUrl.searchParams
  const coords = parseCoords(searchParams.get('lat'), searchParams.get('lng'))

  if (!coords) {
    return NextResponse.json({ error: 'Valid Switzerland lat and lng are required' }, { status: 400 })
  }

  const { lat, lng } = coords
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000

  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    distance: '1000',
    units: 'esriSRUnit_Meter',
    inSR: '4326',
    outSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    where: `reporteddate >= ${oneYearAgo}`,
    outFields: '*',
    returnGeometry: 'true',
    f: 'json',
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${CRIME_LAYER_URL}?${params.toString()}`, { signal: controller.signal })

    if (!res.ok) {
      console.log(`Columbus crime API fetch failed: status ${res.status}`)
      const stateContext = await fetchStateCrimeContext()
      return NextResponse.json({ ...FALLBACK, ...(stateContext ? { stateContext } : {}) })
    }

    const data = await res.json()

    if (data.error || !Array.isArray(data.features)) {
      console.log('Columbus crime API returned an error or unexpected payload:', data.error || data)
      const stateContext = await fetchStateCrimeContext()
      return NextResponse.json({ ...FALLBACK, ...(stateContext ? { stateContext } : {}) })
    }

    const features: Array<{ attributes?: Record<string, unknown>; geometry?: { x?: number; y?: number } }> = data.features
    const incidentCount = features.length

    const typeCounts = new Map<string, number>()
    for (const f of features) {
      const attrs = f.attributes || {}
      const type = String(attrs.offense || attrs.OFFENSE || attrs.crime_type || attrs.Description || 'Unknown')
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
    }

    const topIncidentTypes = [...typeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type)

    const safetyScore = Math.max(0, Math.min(100, Math.round(100 - (incidentCount / 50) * 100)))

    const incidents = features
      .filter(f => f.geometry?.y !== undefined && f.geometry?.x !== undefined)
      .map(f => ({ lat: f.geometry!.y as number, lng: f.geometry!.x as number }))

    const stateContext = await fetchStateCrimeContext()
    return NextResponse.json({ incidentCount, topIncidentTypes, safetyScore, incidents, ...(stateContext ? { stateContext } : {}) })
  } catch (err) {
    console.log('Columbus crime API fetch error:', err)
    const stateContext = await fetchStateCrimeContext()
    return NextResponse.json({ ...FALLBACK, ...(stateContext ? { stateContext } : {}) })
  } finally {
    clearTimeout(timeout)
  }
}
