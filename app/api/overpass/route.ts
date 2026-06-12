import { NextRequest, NextResponse } from 'next/server'

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const TIMEOUT_MS = 10000

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
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  const radius = 800
  const radiusFar = 1000

  const query = `[out:json][timeout:30];
(
  node["shop"~"^(supermarket|grocery|convenience|food)$"](around:${radius},${lat},${lng});
  way["shop"~"^(supermarket|grocery|convenience|food)$"](around:${radius},${lat},${lng});
  node["highway"="bus_stop"](around:${radius},${lat},${lng});
  node["amenity"="bus_station"](around:${radius},${lat},${lng});
  node["railway"~"^(station|halt|tram_stop)$"](around:${radius},${lat},${lng});
  way["leisure"="park"](around:${radius},${lat},${lng});
  relation["leisure"="park"](around:${radius},${lat},${lng});
  node["amenity"="school"](around:${radiusFar},${lat},${lng});
  way["amenity"="school"](around:${radiusFar},${lat},${lng});
  node["amenity"~"^(hospital|clinic|pharmacy)$"](around:${radiusFar},${lat},${lng});
  way["amenity"~"^(hospital|clinic|pharmacy)$"](around:${radiusFar},${lat},${lng});
  node["amenity"~"^(restaurant|cafe)$"](around:${radius},${lat},${lng});
  node["leisure"="fitness_centre"](around:${radiusFar},${lat},${lng});
  way["leisure"="fitness_centre"](around:${radiusFar},${lat},${lng});
);
out tags;`

  for (const url of OVERPASS_URLS) {
    const data = await queryOverpass(url, query)
    if (data) return NextResponse.json(data)
  }

  console.log('All Overpass endpoints failed, returning fallback response')
  return NextResponse.json({ elements: [], fallback: true })
}
