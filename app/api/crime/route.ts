import { NextRequest, NextResponse } from 'next/server'

// Columbus does not currently publish a queryable point-level crime incident layer on
// gis.columbus.gov, maps2.columbus.gov, or opendata.columbus.gov (PublicSafety/MapServer only
// exposes precincts, zones, cruiser districts and station locations; CPD_Density is a
// tiles-only raster with no query capability). This endpoint is kept for if/when CPD
// publishes one; until then the request fails and the fallback below is returned.
const CRIME_LAYER_URL =
  'https://gis.columbus.gov/arcgis/rest/services/PublicSafety/PoliceIncidents/MapServer/0/query'

const TIMEOUT_MS = 10000
const FALLBACK = { incidentCount: 0, topIncidentTypes: [], safetyScore: 60, note: 'data unavailable' }

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000

  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    distance: '1000',
    units: 'esriSRUnit_Meter',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    where: `reporteddate >= ${oneYearAgo}`,
    outFields: '*',
    f: 'json',
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${CRIME_LAYER_URL}?${params.toString()}`, { signal: controller.signal })

    if (!res.ok) {
      console.log(`Columbus crime API fetch failed: status ${res.status}`)
      return NextResponse.json(FALLBACK)
    }

    const data = await res.json()

    if (data.error || !Array.isArray(data.features)) {
      console.log('Columbus crime API returned an error or unexpected payload:', data.error || data)
      return NextResponse.json(FALLBACK)
    }

    const features: Array<{ attributes?: Record<string, unknown> }> = data.features
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

    return NextResponse.json({ incidentCount, topIncidentTypes, safetyScore })
  } catch (err) {
    console.log('Columbus crime API fetch error:', err)
    return NextResponse.json(FALLBACK)
  } finally {
    clearTimeout(timeout)
  }
}
