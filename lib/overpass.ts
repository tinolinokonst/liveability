import { AmenityScores } from './types'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

export async function fetchAmenityScores(lat: number, lng: number): Promise<AmenityScores> {
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

  if (!res.ok) throw new Error('Overpass API fetch failed')

  const data = await res.json()
  const elements: Array<{ tags?: Record<string, string> }> = data.elements || []

  const groceryCount = elements.filter(e =>
    ['supermarket', 'grocery', 'convenience', 'food'].includes(e.tags?.shop || '')
  ).length

  const transitCount = elements.filter(e =>
    e.tags?.highway === 'bus_stop' ||
    e.tags?.amenity === 'bus_station' ||
    ['station', 'halt', 'tram_stop'].includes(e.tags?.railway || '')
  ).length

  const parkCount = elements.filter(e => e.tags?.leisure === 'park').length

  const groceryScore = Math.min(100, Math.round((groceryCount / 5) * 100))
  const transitScore = Math.min(100, Math.round((transitCount / 10) * 100))
  const greenScore = Math.min(100, Math.round((parkCount / 3) * 100))
  const walkabilityScore = Math.round((groceryScore + transitScore + greenScore) / 3)

  return {
    groceryCount,
    transitCount,
    parkCount,
    groceryScore,
    transitScore,
    greenScore,
    walkabilityScore,
  }
}
