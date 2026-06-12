import { AmenityScores } from './types'

const FALLBACK_SCORES: AmenityScores = {
  groceryCount: 0,
  transitCount: 0,
  parkCount: 0,
  schoolCount: 0,
  healthcareCount: 0,
  diningCount: 0,
  gymCount: 0,
  groceryScore: 50,
  transitScore: 50,
  greenScore: 50,
  schoolScore: 50,
  healthcareScore: 50,
  diningScore: 50,
  gymScore: 50,
  walkabilityScore: 50,
  note: 'estimate - live data unavailable',
}

export async function fetchAmenityScores(lat: number, lng: number): Promise<AmenityScores> {
  const res = await fetch(`/api/overpass?lat=${lat}&lng=${lng}`)

  if (!res.ok) throw new Error('Overpass API fetch failed')

  const data = await res.json()

  if (data.fallback) {
    return { ...FALLBACK_SCORES }
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

  const schoolCount = elements.filter(e => e.tags?.amenity === 'school').length

  const healthcareCount = elements.filter(e =>
    ['hospital', 'clinic', 'pharmacy'].includes(e.tags?.amenity || '')
  ).length

  const diningCount = elements.filter(e =>
    ['restaurant', 'cafe'].includes(e.tags?.amenity || '')
  ).length

  const gymCount = elements.filter(e => e.tags?.leisure === 'fitness_centre').length

  const groceryScore = Math.min(100, Math.round((groceryCount / 5) * 100))
  const transitScore = Math.min(100, Math.round((transitCount / 10) * 100))
  const greenScore = Math.min(100, Math.round((parkCount / 3) * 100))
  const schoolScore = Math.min(100, Math.round((schoolCount / 3) * 100))
  const healthcareScore = Math.min(100, Math.round((healthcareCount / 5) * 100))
  const diningScore = Math.min(100, Math.round((diningCount / 8) * 100))
  const gymScore = Math.min(100, Math.round((gymCount / 2) * 100))
  const walkabilityScore = Math.round((groceryScore + transitScore + greenScore) / 3)

  return {
    groceryCount,
    transitCount,
    parkCount,
    schoolCount,
    healthcareCount,
    diningCount,
    gymCount,
    groceryScore,
    transitScore,
    greenScore,
    schoolScore,
    healthcareScore,
    diningScore,
    gymScore,
    walkabilityScore,
  }
}
