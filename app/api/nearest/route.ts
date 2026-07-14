import { NextRequest, NextResponse } from 'next/server'
import { NearestEssentialItem, NearestEssentials } from '@/lib/types'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'

const OVERPASS_URLS = [
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const SEARCH_RADIUS = 5000
const TIMEOUT_MS = 15000

interface Element {
  tags?: Record<string, string>
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
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

function findNearest(elements: Element[], lat: number, lng: number): NearestEssentialItem | null {
  let best: NearestEssentialItem | null = null
  for (const e of elements) {
    const elat = e.lat ?? e.center?.lat
    const elon = e.lon ?? e.center?.lon
    if (elat === undefined || elon === undefined) continue
    const d = haversineKm(lat, lng, elat, elon)
    if (!best || d < best.distanceKm) {
      best = { name: e.tags?.name ?? null, distanceKm: Math.round(d * 10) / 10, lat: elat, lng: elon }
    }
  }
  return best
}

async function queryOverpass(url: string, query: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: new URLSearchParams({ data: query }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'liveability-switzerland/1.0',
      },
      signal: controller.signal,
    })
    if (!res.ok) {
      console.log(`Nearest Overpass fetch failed for ${url}: ${res.status}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.log(`Nearest Overpass error for ${url}:`, err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

const EMPTY_RESULT: Omit<NearestEssentials, 'searchRadiusKm'> = {
  trainStation: null, busStop: null, grocery: null, hospital: null,
  pharmacy: null, school: null, library: null, park: null, bank: null,
  dining: null, worship: null, parking: null,
}

export async function GET(request: NextRequest) {
  const guard = await guardRequest('nearest', 60, 3600)
  if ('response' in guard) return guard.response

  const { searchParams } = request.nextUrl
  const coords = parseCoords(searchParams.get('lat'), searchParams.get('lng'))

  if (!coords) {
    return NextResponse.json({ error: 'Valid Switzerland lat and lng are required' }, { status: 400 })
  }

  const { lat: latN, lng: lngN } = coords

  const query = `[out:json][timeout:30];
(
  node["railway"="station"](around:${SEARCH_RADIUS},${latN},${lngN});
  way["railway"="station"](around:${SEARCH_RADIUS},${latN},${lngN});
  node["highway"="bus_stop"](around:${SEARCH_RADIUS},${latN},${lngN});
  node["shop"~"^(supermarket|grocery|convenience|food|deli|greengrocer|organic|health_food)$"](around:${SEARCH_RADIUS},${latN},${lngN});
  way["shop"~"^(supermarket|grocery|convenience|food|deli|greengrocer|organic|health_food)$"](around:${SEARCH_RADIUS},${latN},${lngN});
  node["amenity"="hospital"](around:${SEARCH_RADIUS},${latN},${lngN});
  way["amenity"="hospital"](around:${SEARCH_RADIUS},${latN},${lngN});
  node["amenity"="pharmacy"](around:${SEARCH_RADIUS},${latN},${lngN});
  node["amenity"~"^(school|college|university|kindergarten)$"](around:${SEARCH_RADIUS},${latN},${lngN});
  way["amenity"~"^(school|college|university|kindergarten)$"](around:${SEARCH_RADIUS},${latN},${lngN});
  node["amenity"="library"](around:${SEARCH_RADIUS},${latN},${lngN});
  way["amenity"="library"](around:${SEARCH_RADIUS},${latN},${lngN});
  node["leisure"="park"](around:${SEARCH_RADIUS},${latN},${lngN});
  way["leisure"="park"](around:${SEARCH_RADIUS},${latN},${lngN});
  relation["leisure"="park"](around:${SEARCH_RADIUS},${latN},${lngN});
  node["leisure"="garden"](around:${SEARCH_RADIUS},${latN},${lngN});
  way["leisure"="garden"](around:${SEARCH_RADIUS},${latN},${lngN});
  node["landuse"="recreation_ground"](around:${SEARCH_RADIUS},${latN},${lngN});
  way["landuse"="recreation_ground"](around:${SEARCH_RADIUS},${latN},${lngN});
  node["amenity"~"^(bank|atm)$"](around:${SEARCH_RADIUS},${latN},${lngN});
  node["amenity"~"^(restaurant|cafe|fast_food)$"](around:${SEARCH_RADIUS},${latN},${lngN});
  way["amenity"~"^(restaurant|cafe|fast_food)$"](around:${SEARCH_RADIUS},${latN},${lngN});
  node["amenity"="place_of_worship"](around:${SEARCH_RADIUS},${latN},${lngN});
  way["amenity"="place_of_worship"](around:${SEARCH_RADIUS},${latN},${lngN});
  node["amenity"="parking"](around:${SEARCH_RADIUS},${latN},${lngN});
  way["amenity"="parking"](around:${SEARCH_RADIUS},${latN},${lngN});
);
out tags center;`

  for (const url of OVERPASS_URLS) {
    const data = await queryOverpass(url, query)
    if (!data || !Array.isArray(data.elements)) continue

    const els: Element[] = data.elements

    return NextResponse.json({
      trainStation: findNearest(els.filter(e => e.tags?.railway === 'station'), latN, lngN),
      busStop:      findNearest(els.filter(e => e.tags?.highway === 'bus_stop'), latN, lngN),
      grocery:      findNearest(els.filter(e => ['supermarket', 'grocery', 'convenience', 'food', 'deli', 'greengrocer', 'organic', 'health_food'].includes(e.tags?.shop ?? '')), latN, lngN),
      hospital:     findNearest(els.filter(e => e.tags?.amenity === 'hospital'), latN, lngN),
      pharmacy:     findNearest(els.filter(e => e.tags?.amenity === 'pharmacy'), latN, lngN),
      school:       findNearest(els.filter(e => ['school', 'college', 'university', 'kindergarten'].includes(e.tags?.amenity ?? '')), latN, lngN),
      library:      findNearest(els.filter(e => e.tags?.amenity === 'library'), latN, lngN),
      park:         findNearest(els.filter(e => e.tags?.leisure === 'park' || e.tags?.leisure === 'garden' || e.tags?.landuse === 'recreation_ground'), latN, lngN),
      bank:         findNearest(els.filter(e => ['bank', 'atm'].includes(e.tags?.amenity ?? '')), latN, lngN),
      dining:       findNearest(els.filter(e => ['restaurant', 'cafe', 'fast_food'].includes(e.tags?.amenity ?? '')), latN, lngN),
      worship:      findNearest(els.filter(e => e.tags?.amenity === 'place_of_worship'), latN, lngN),
      parking:      findNearest(els.filter(e => e.tags?.amenity === 'parking'), latN, lngN),
      searchRadiusKm: SEARCH_RADIUS / 1000,
    } satisfies NearestEssentials)
  }

  console.log('All Overpass endpoints failed for nearest essentials')
  return NextResponse.json({ ...EMPTY_RESULT, searchRadiusKm: SEARCH_RADIUS / 1000 })
}
