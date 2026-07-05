import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const TIMEOUT_MS = 10000
const RADIUS_METERS = 200

// Higher weight = noisier road type. Used to penalize the noise score based on
// road classification and how close the nearest segment is.
const ROAD_WEIGHTS: Record<string, number> = {
  motorway: 90,
  motorway_link: 80,
  trunk: 80,
  trunk_link: 70,
  primary: 65,
  primary_link: 55,
  secondary: 45,
  secondary_link: 35,
  tertiary: 30,
  tertiary_link: 25,
  unclassified: 15,
  residential: 12,
  living_street: 8,
  service: 6,
}

const UNAVAILABLE = { score: null, level: null, nearestRoad: null, available: false, message: 'Noise estimate unavailable' }

interface OverpassWay {
  tags?: Record<string, string>
  geometry?: { lat: number; lon: number }[]
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function levelForScore(score: number): string {
  if (score >= 80) return 'Quiet'
  if (score >= 50) return 'Moderate'
  return 'Loud'
}

async function queryOverpass(url: string, query: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain' },
      signal: controller.signal,
    })

    if (!res.ok) {
      console.log(`Overpass noise fetch failed for ${url}: status ${res.status}`)
      return null
    }

    return await res.json()
  } catch (err) {
    console.log(`Overpass noise fetch error for ${url}:`, err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: NextRequest) {
  const guard = await guardRequest('noise', 60, 3600)
  if ('response' in guard) return guard.response

  const searchParams = request.nextUrl.searchParams
  const coords = parseCoords(searchParams.get('lat'), searchParams.get('lng'))

  if (!coords) {
    return NextResponse.json({ error: 'Valid Columbus-area lat and lng are required' }, { status: 400 })
  }

  const { lat, lng } = coords

  const classes = Object.keys(ROAD_WEIGHTS).join('|')
  const query = `[out:json][timeout:25];
(
  way["highway"~"^(${classes})$"](around:${RADIUS_METERS},${lat},${lng});
);
out geom tags;`

  for (const url of OVERPASS_URLS) {
    const data = await queryOverpass(url, query)
    if (!data) continue

    const ways: OverpassWay[] = data.elements || []

    let worstScore = 100
    let nearestRoad: { name: string; distanceKm: number; classification: string } | null = null
    let nearestDistance = Infinity

    for (const way of ways) {
      const highway = way.tags?.highway
      const weight = highway ? ROAD_WEIGHTS[highway] : undefined
      if (!weight || !way.geometry?.length) continue

      let minDistanceKm = Infinity
      for (const point of way.geometry) {
        const d = haversineKm(lat, lng, point.lat, point.lon)
        if (d < minDistanceKm) minDistanceKm = d
      }

      if (minDistanceKm > RADIUS_METERS / 1000) continue

      const penalty = weight * (1 - minDistanceKm / (RADIUS_METERS / 1000))
      const candidateScore = 100 - penalty
      if (candidateScore < worstScore) worstScore = candidateScore

      if (minDistanceKm < nearestDistance) {
        nearestDistance = minDistanceKm
        nearestRoad = {
          name: way.tags?.name || 'Unnamed road',
          distanceKm: Math.round(minDistanceKm * 10) / 10,
          classification: highway!,
        }
      }
    }

    const score = Math.round(Math.max(0, Math.min(100, worstScore)))
    return NextResponse.json({ score, level: levelForScore(score), nearestRoad, available: true })
  }

  console.log('All Overpass endpoints failed for noise estimate, returning unavailable response')
  return NextResponse.json(UNAVAILABLE)
}
