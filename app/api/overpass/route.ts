import { NextRequest, NextResponse } from 'next/server'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  const radius = 800

  const query = `[out:json][timeout:30];
(
  node["shop"~"^(supermarket|grocery|convenience|food)$"](around:${radius},${lat},${lng});
  way["shop"~"^(supermarket|grocery|convenience|food)$"](around:${radius},${lat},${lng});
  node["highway"="bus_stop"](around:${radius},${lat},${lng});
  node["amenity"="bus_station"](around:${radius},${lat},${lng});
  node["railway"~"^(station|halt|tram_stop)$"](around:${radius},${lat},${lng});
  way["leisure"="park"](around:${radius},${lat},${lng});
  relation["leisure"="park"](around:${radius},${lat},${lng});
);
out tags;`

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'text/plain' },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Overpass API fetch failed' }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
