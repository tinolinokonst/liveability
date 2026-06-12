import { AmenityScores } from './types'

export async function fetchAmenityScores(lat: number, lng: number): Promise<AmenityScores> {
  const res = await fetch(`/api/overpass?lat=${lat}&lng=${lng}`)

  if (!res.ok) throw new Error('Overpass API fetch failed')

  const data = await res.json()

  if (data.fallback) {
    return {
      groceryCount: 0,
      transitCount: 0,
      parkCount: 0,
      groceryScore: 50,
      transitScore: 50,
      greenScore: 50,
      walkabilityScore: 50,
      note: 'estimate - live data unavailable',
    }
  }

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
