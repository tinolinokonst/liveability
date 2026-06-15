import { AmenityPlaces, AmenityScores, NearestAmenity } from './types'

const EMPTY_PLACES: AmenityPlaces = {
  grocery: [],
  transit: [],
  park: [],
  school: [],
  healthcare: [],
  dining: [],
  library: [],
  bank: [],
  worship: [],
  parking: [],
}

const FALLBACK_SCORES: Omit<AmenityScores, 'radius'> = {
  groceryCount: 0,
  transitCount: 0,
  parkCount: 0,
  schoolCount: 0,
  healthcareCount: 0,
  diningCount: 0,
  gymCount: 0,
  libraryCount: 0,
  bankCount: 0,
  worshipCount: 0,
  parkingCount: 0,
  groceryScore: 50,
  transitScore: 50,
  greenScore: 50,
  schoolScore: 50,
  healthcareScore: 50,
  diningScore: 50,
  gymScore: 50,
  libraryScore: 50,
  bankScore: 50,
  worshipScore: 50,
  parkingScore: 50,
  walkabilityScore: 50,
  nearestGrocery: null,
  nearestPark: null,
  nearestSchool: null,
  nearestHealthcare: null,
  nearestDining: null,
  nearestLibrary: null,
  nearestBank: null,
  nearestWorship: null,
  nearestParking: null,
  places: EMPTY_PLACES,
  note: 'estimate - live data unavailable',
}

interface OverpassElement {
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

function elementName(e: OverpassElement, fallback: string): string {
  return e.tags?.name || fallback
}

type AmenityKind = 'grocery' | 'transit' | 'park' | 'school' | 'healthcare' | 'dining' | 'library' | 'bank' | 'worship' | 'parking'

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function elementCategory(e: OverpassElement, kind: AmenityKind): string | undefined {
  const tags = e.tags || {}

  switch (kind) {
    case 'grocery': {
      const shopLabels: Record<string, string> = {
        supermarket: 'Supermarket',
        convenience: 'Convenience store',
        grocery: 'Grocery store',
        food: 'Food shop',
      }
      return tags.shop ? shopLabels[tags.shop] : undefined
    }
    case 'school': {
      const typeLabels: Record<string, string> = { school: 'School', college: 'College' }
      const base = typeLabels[tags.amenity ?? '']
      if (!base) return undefined
      return tags['isced:level'] ? `${base} (ISCED ${tags['isced:level']})` : base
    }
    case 'healthcare': {
      const typeLabels: Record<string, string> = {
        hospital: 'Hospital',
        clinic: 'Clinic',
        pharmacy: 'Pharmacy',
        doctors: "Doctor's office",
      }
      return typeLabels[tags.amenity ?? '']
    }
    case 'dining': {
      const type = tags.amenity === 'cafe' ? 'Cafe' : 'Restaurant'
      if (tags.cuisine) {
        const cuisine = capitalize(tags.cuisine.split(';')[0].replace(/_/g, ' '))
        return `${type} · ${cuisine}`
      }
      return type
    }
    default:
      return undefined
  }
}

function nearest(elements: OverpassElement[], lat: number, lng: number, fallbackName: string, kind?: AmenityKind): NearestAmenity | null {
  let best: NearestAmenity | null = null

  for (const e of elements) {
    const elat = e.lat ?? e.center?.lat
    const elon = e.lon ?? e.center?.lon
    if (elat === undefined || elon === undefined) continue

    const distanceKm = haversineKm(lat, lng, elat, elon)
    if (!best || distanceKm < best.distanceKm) {
      best = {
        name: elementName(e, fallbackName),
        distanceKm: Math.round(distanceKm * 10) / 10,
        lat: elat,
        lng: elon,
        category: kind ? elementCategory(e, kind) : undefined,
      }
    }
  }

  return best
}

function nearestList(elements: OverpassElement[], lat: number, lng: number, fallbackName: string, kind?: AmenityKind, limit: number = 8): NearestAmenity[] {
  const places: NearestAmenity[] = []

  for (const e of elements) {
    const elat = e.lat ?? e.center?.lat
    const elon = e.lon ?? e.center?.lon
    if (elat === undefined || elon === undefined) continue

    const distanceKm = haversineKm(lat, lng, elat, elon)
    places.push({
      name: elementName(e, fallbackName),
      distanceKm: Math.round(distanceKm * 10) / 10,
      lat: elat,
      lng: elon,
      category: kind ? elementCategory(e, kind) : undefined,
    })
  }

  return places.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit)
}

export async function fetchAmenityScores(lat: number, lng: number, radius: number = 800): Promise<AmenityScores> {
  const res = await fetch(`/api/overpass?lat=${lat}&lng=${lng}&radius=${radius}`)

  if (!res.ok) throw new Error('Overpass API fetch failed')

  const data = await res.json()

  if (data.fallback) {
    return { ...FALLBACK_SCORES, radius: data.radius ?? radius }
  }

  const elements: OverpassElement[] = data.elements || []
  const usedRadius: number = data.radius ?? radius

  const groceryElements = elements.filter(e =>
    ['supermarket', 'grocery', 'convenience', 'food'].includes(e.tags?.shop || '')
  )

  const transitElements = elements.filter(e =>
    e.tags?.highway === 'bus_stop' ||
    e.tags?.amenity === 'bus_station' ||
    ['station', 'halt', 'tram_stop'].includes(e.tags?.railway || '')
  )

  const parkElements = elements.filter(e => e.tags?.leisure === 'park')

  const schoolElements = elements.filter(e => ['school', 'college'].includes(e.tags?.amenity || ''))

  const healthcareElements = elements.filter(e =>
    ['hospital', 'clinic', 'pharmacy', 'doctors'].includes(e.tags?.amenity || '')
  )

  const diningElements = elements.filter(e =>
    ['restaurant', 'cafe'].includes(e.tags?.amenity || '')
  )

  const gymElements = elements.filter(e => e.tags?.leisure === 'fitness_centre')

  const libraryElements = elements.filter(e => e.tags?.amenity === 'library')

  const bankElements = elements.filter(e => ['bank', 'atm'].includes(e.tags?.amenity || ''))

  const worshipElements = elements.filter(e => e.tags?.amenity === 'place_of_worship')

  const parkingElements = elements.filter(e => e.tags?.amenity === 'parking')

  const groceryCount = groceryElements.length
  const transitCount = transitElements.length
  const parkCount = parkElements.length
  const schoolCount = schoolElements.length
  const healthcareCount = healthcareElements.length
  const diningCount = diningElements.length
  const gymCount = gymElements.length
  const libraryCount = libraryElements.length
  const bankCount = bankElements.length
  const worshipCount = worshipElements.length
  const parkingCount = parkingElements.length

  const groceryScore = Math.min(100, Math.round((groceryCount / 5) * 100))
  const transitScore = Math.min(100, Math.round((transitCount / 10) * 100))
  const greenScore = Math.min(100, Math.round((parkCount / 3) * 100))
  const schoolScore = Math.min(100, Math.round((schoolCount / 3) * 100))
  const healthcareScore = Math.min(100, Math.round((healthcareCount / 5) * 100))
  const diningScore = Math.min(100, Math.round((diningCount / 8) * 100))
  const gymScore = Math.min(100, Math.round((gymCount / 2) * 100))
  const libraryScore = Math.min(100, Math.round((libraryCount / 2) * 100))
  const bankScore = Math.min(100, Math.round((bankCount / 5) * 100))
  const worshipScore = Math.min(100, Math.round((worshipCount / 3) * 100))
  const parkingScore = Math.min(100, Math.round((parkingCount / 3) * 100))
  const walkabilityScore = Math.round((groceryScore + transitScore + greenScore) / 3)

  return {
    groceryCount,
    transitCount,
    parkCount,
    schoolCount,
    healthcareCount,
    diningCount,
    gymCount,
    libraryCount,
    bankCount,
    worshipCount,
    parkingCount,
    groceryScore,
    transitScore,
    greenScore,
    schoolScore,
    healthcareScore,
    diningScore,
    gymScore,
    libraryScore,
    bankScore,
    worshipScore,
    parkingScore,
    walkabilityScore,
    radius: usedRadius,
    nearestGrocery: nearest(groceryElements, lat, lng, 'Grocery store (no name in OSM)', 'grocery'),
    nearestPark: nearest(parkElements, lat, lng, 'Park (no name in OSM)', 'park'),
    nearestSchool: nearest(schoolElements, lat, lng, 'School (no name in OSM)', 'school'),
    nearestHealthcare: nearest(healthcareElements, lat, lng, 'Healthcare facility (no name in OSM)', 'healthcare'),
    nearestDining: nearest(diningElements, lat, lng, 'Restaurant/cafe (no name in OSM)', 'dining'),
    nearestLibrary: nearest(libraryElements, lat, lng, 'Library (no name in OSM)', 'library'),
    nearestBank: nearest(bankElements, lat, lng, 'Bank/ATM (no name in OSM)', 'bank'),
    nearestWorship: nearest(worshipElements, lat, lng, 'Place of worship (no name in OSM)', 'worship'),
    nearestParking: nearest(parkingElements, lat, lng, 'Parking (no name in OSM)', 'parking'),
    places: {
      grocery: nearestList(groceryElements, lat, lng, 'Grocery store (no name in OSM)', 'grocery'),
      transit: nearestList(transitElements, lat, lng, 'Transit stop (no name in OSM)', 'transit'),
      park: nearestList(parkElements, lat, lng, 'Park (no name in OSM)', 'park'),
      school: nearestList(schoolElements, lat, lng, 'School (no name in OSM)', 'school'),
      healthcare: nearestList(healthcareElements, lat, lng, 'Healthcare facility (no name in OSM)', 'healthcare'),
      dining: nearestList(diningElements, lat, lng, 'Restaurant/cafe (no name in OSM)', 'dining'),
      library: nearestList(libraryElements, lat, lng, 'Library (no name in OSM)', 'library'),
      bank: nearestList(bankElements, lat, lng, 'Bank/ATM (no name in OSM)', 'bank'),
      worship: nearestList(worshipElements, lat, lng, 'Place of worship (no name in OSM)', 'worship'),
      parking: nearestList(parkingElements, lat, lng, 'Parking (no name in OSM)', 'parking'),
    },
  }
}
