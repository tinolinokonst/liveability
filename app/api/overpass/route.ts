import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const TIMEOUT_MS = 15000
const ALLOWED_RADII = [400, 800, 1600, 3000]
const DEFAULT_RADIUS = 800

async function queryOverpass(url: string, query: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: new URLSearchParams({ data: query }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'liveability-columbus/1.0',
      },
      signal: controller.signal,
    })

    if (!res.ok) {
      console.log(`Overpass fetch failed for ${url}: status ${res.status}`)
      return null
    }

    return await res.json()
  } catch (err) {
    console.log(`Overpass fetch error for ${url}:`, err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: NextRequest) {
  const guard = await guardRequest('overpass', 60, 3600)
  if ('response' in guard) return guard.response

  const searchParams = request.nextUrl.searchParams
  const coords = parseCoords(searchParams.get('lat'), searchParams.get('lng'))

  if (!coords) {
    return NextResponse.json({ error: 'Valid Columbus-area lat and lng are required' }, { status: 400 })
  }

  const { lat, lng } = coords

  const requestedRadius = Number(searchParams.get('radius'))
  const radius = ALLOWED_RADII.includes(requestedRadius) ? requestedRadius : DEFAULT_RADIUS

  // Transit and fitness centers are searched over a fixed radius, independent of the amenity radius selector
  const transitRadius = 800
  const gymRadius = 1000
  const libraryRadius = 1600
  const bankRadius = 800
  const worshipRadius = 1600
  const parkingRadius = 400

  const query = `[out:json][timeout:30];
(
  node["shop"~"^(supermarket|grocery|convenience|food|deli|greengrocer|organic|health_food)$"](around:${radius},${lat},${lng});
  way["shop"~"^(supermarket|grocery|convenience|food|deli|greengrocer|organic|health_food)$"](around:${radius},${lat},${lng});
  node["highway"="bus_stop"](around:${transitRadius},${lat},${lng});
  node["amenity"="bus_station"](around:${transitRadius},${lat},${lng});
  node["railway"~"^(station|halt|tram_stop)$"](around:${transitRadius},${lat},${lng});
  node["public_transport"="stop_position"](around:${transitRadius},${lat},${lng});
  node["leisure"="park"](around:${radius},${lat},${lng});
  way["leisure"="park"](around:${radius},${lat},${lng});
  relation["leisure"="park"](around:${radius},${lat},${lng});
  node["leisure"="garden"](around:${radius},${lat},${lng});
  way["leisure"="garden"](around:${radius},${lat},${lng});
  node["landuse"="recreation_ground"](around:${radius},${lat},${lng});
  way["landuse"="recreation_ground"](around:${radius},${lat},${lng});
  node["amenity"~"^(school|college|university|kindergarten)$"](around:${radius},${lat},${lng});
  way["amenity"~"^(school|college|university|kindergarten)$"](around:${radius},${lat},${lng});
  node["amenity"~"^(hospital|clinic|pharmacy|doctors)$"](around:${radius},${lat},${lng});
  way["amenity"~"^(hospital|clinic|pharmacy|doctors)$"](around:${radius},${lat},${lng});
  node["amenity"~"^(restaurant|cafe|fast_food)$"](around:${radius},${lat},${lng});
  way["amenity"~"^(restaurant|cafe|fast_food)$"](around:${radius},${lat},${lng});
  node["leisure"="fitness_centre"](around:${gymRadius},${lat},${lng});
  way["leisure"="fitness_centre"](around:${gymRadius},${lat},${lng});
  node["amenity"="library"](around:${libraryRadius},${lat},${lng});
  way["amenity"="library"](around:${libraryRadius},${lat},${lng});
  node["amenity"~"^(bank|atm)$"](around:${bankRadius},${lat},${lng});
  node["amenity"="place_of_worship"](around:${worshipRadius},${lat},${lng});
  way["amenity"="place_of_worship"](around:${worshipRadius},${lat},${lng});
  node["amenity"="parking"](around:${parkingRadius},${lat},${lng});
  way["amenity"="parking"](around:${parkingRadius},${lat},${lng});
);
out body;
>;
out skel qt;`

  for (const url of OVERPASS_URLS) {
    const data = await queryOverpass(url, query)
    if (data) {
      const els = data.elements as Array<{ type?: string }> | undefined
      const wayCount = els?.filter(e => e.type === 'way').length ?? 0
      const nodeCount = els?.filter(e => e.type === 'node').length ?? 0
      console.log(`[Overpass] ${els?.length ?? 0} elements: ${nodeCount} nodes, ${wayCount} ways (lat:${lat}, lng:${lng})`)
      return NextResponse.json({ ...data, radius })
    }
  }

  console.log('All Overpass endpoints failed, returning fallback response')
  return NextResponse.json({ elements: [], fallback: true, radius })
}
