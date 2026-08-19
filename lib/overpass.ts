import { AmenityPlaces, AmenityScores, NearestAmenity } from './types'
import { roundKm } from './format'

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
  note: 'Amenity data unavailable — please try again',
}

interface OverpassElement {
  type?: 'node' | 'way' | 'relation'
  id?: number
  tags?: Record<string, string>
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  nodes?: number[]
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
    case 'transit': {
      const tags = e.tags || {}
      const type =
        tags.railway === 'station' ? 'Train station' :
        tags.railway === 'halt' ? 'Train halt' :
        tags.railway === 'tram_stop' ? 'Tram stop' :
        tags.amenity === 'bus_station' ? 'Bus station' :
        'Bus stop'
      const routeRef = tags.route_ref
      return routeRef ? `${type} · Routes ${routeRef}` : type
    }
    case 'grocery': {
      const shopLabels: Record<string, string> = {
        supermarket: 'Supermarket',
        convenience: 'Convenience store',
        grocery: 'Grocery store',
        food: 'Food shop',
        deli: 'Deli',
        greengrocer: 'Greengrocer',
        organic: 'Organic store',
        health_food: 'Health food store',
      }
      return tags.shop ? shopLabels[tags.shop] : undefined
    }
    case 'school': {
      const typeLabels: Record<string, string> = { school: 'School', college: 'College', university: 'University', kindergarten: 'Kindergarten' }
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
      const type = tags.amenity === 'cafe' ? 'Cafe' : tags.amenity === 'fast_food' ? 'Fast food' : 'Restaurant'
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

function getElementLatLon(
  e: OverpassElement,
  nodeMap: Map<number, [number, number]>
): [number, number] | null {
  if (e.lat !== undefined && e.lon !== undefined) return [e.lat, e.lon]
  if (e.center) return [e.center.lat, e.center.lon]
  if (e.nodes?.length) {
    let latSum = 0, lonSum = 0, count = 0
    for (const nid of e.nodes) {
      const pt = nodeMap.get(nid)
      if (pt) { latSum += pt[0]; lonSum += pt[1]; count++ }
    }
    if (count > 0) return [latSum / count, lonSum / count]
  }
  return null
}

function nearest(
  elements: OverpassElement[],
  lat: number,
  lng: number,
  fallbackName: string,
  kind?: AmenityKind,
  nodeMap: Map<number, [number, number]> = new Map()
): NearestAmenity | null {
  let best: NearestAmenity | null = null

  for (const e of elements) {
    const pos = getElementLatLon(e, nodeMap)
    if (!pos) continue
    const [elat, elon] = pos

    const distanceKm = haversineKm(lat, lng, elat, elon)
    if (!best || distanceKm < best.distanceKm) {
      best = {
        name: elementName(e, fallbackName),
        distanceKm: roundKm(distanceKm),
        lat: elat,
        lng: elon,
        category: kind ? elementCategory(e, kind) : undefined,
      }
    }
  }

  return best
}

function nearestList(
  elements: OverpassElement[],
  lat: number,
  lng: number,
  fallbackName: string,
  kind?: AmenityKind,
  limit: number = 8,
  nodeMap?: Map<number, [number, number]>,
  polygonColor?: string,
): NearestAmenity[] {
  const places: NearestAmenity[] = []

  for (const e of elements) {
    const pos = getElementLatLon(e, nodeMap ?? new Map())
    if (!pos) continue
    const [elat, elon] = pos

    const distanceKm = haversineKm(lat, lng, elat, elon)

    let polygon: [number, number][] | undefined
    if (polygonColor && nodeMap && e.nodes?.length) {
      const coords: [number, number][] = []
      for (const nid of e.nodes) {
        const pt = nodeMap.get(nid)
        if (pt) coords.push(pt)
      }
      if (coords.length >= 3) polygon = coords
    }

    places.push({
      name: elementName(e, fallbackName),
      distanceKm: roundKm(distanceKm),
      lat: elat,
      lng: elon,
      category: kind ? elementCategory(e, kind) : undefined,
      polygon,
      polygonColor: polygon ? polygonColor : undefined,
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

  // Build a map of node id → [lat, lon] so we can reconstruct way polygon geometry
  const nodeMap = new Map<number, [number, number]>()
  for (const e of elements) {
    if (e.id !== undefined && e.lat !== undefined && e.lon !== undefined) {
      nodeMap.set(e.id, [e.lat, e.lon])
    }
  }

  const groceryElements = elements.filter(e =>
    ['supermarket', 'grocery', 'convenience', 'food', 'deli', 'greengrocer', 'organic', 'health_food'].includes(e.tags?.shop || '')
  )

  const transitElements = elements.filter(e =>
    e.tags?.highway === 'bus_stop' ||
    e.tags?.amenity === 'bus_station' ||
    e.tags?.public_transport === 'stop_position' ||
    ['station', 'halt', 'tram_stop'].includes(e.tags?.railway || '')
  )

  const parkElements = elements.filter(e =>
    e.tags?.leisure === 'park' ||
    e.tags?.leisure === 'garden' ||
    e.tags?.landuse === 'recreation_ground'
  )

  const schoolElements = elements.filter(e => ['school', 'college', 'university', 'kindergarten'].includes(e.tags?.amenity || ''))

  const healthcareElements = elements.filter(e =>
    ['hospital', 'clinic', 'pharmacy', 'doctors'].includes(e.tags?.amenity || '')
  )

  const diningElements = elements.filter(e =>
    ['restaurant', 'cafe', 'fast_food'].includes(e.tags?.amenity || '')
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
    nearestGrocery: nearest(groceryElements, lat, lng, 'Grocery store (no name in OSM)', 'grocery', nodeMap),
    nearestPark: nearest(parkElements, lat, lng, 'Park (no name in OSM)', 'park', nodeMap),
    nearestSchool: nearest(schoolElements, lat, lng, 'School (no name in OSM)', 'school', nodeMap),
    nearestHealthcare: nearest(healthcareElements, lat, lng, 'Healthcare facility (no name in OSM)', 'healthcare', nodeMap),
    nearestDining: nearest(diningElements, lat, lng, 'Restaurant/cafe (no name in OSM)', 'dining', nodeMap),
    nearestLibrary: nearest(libraryElements, lat, lng, 'Library (no name in OSM)', 'library', nodeMap),
    nearestBank: nearest(bankElements, lat, lng, 'Bank/ATM (no name in OSM)', 'bank', nodeMap),
    nearestWorship: nearest(worshipElements, lat, lng, 'Place of worship (no name in OSM)', 'worship', nodeMap),
    nearestParking: nearest(parkingElements, lat, lng, 'Parking (no name in OSM)', 'parking', nodeMap),
    places: {
      grocery:    nearestList(groceryElements,    lat, lng, 'Grocery store (no name in OSM)',         'grocery',    8,  nodeMap, '#f97316'),
      transit:    nearestList(transitElements,    lat, lng, 'Transit stop (no name in OSM)',           'transit',    20),
      park:       nearestList(parkElements,       lat, lng, 'Park (no name in OSM)',                  'park',       8,  nodeMap, '#22c55e'),
      school:     nearestList(schoolElements,     lat, lng, 'School (no name in OSM)',                'school',     8,  nodeMap, '#3b82f6'),
      healthcare: nearestList(healthcareElements, lat, lng, 'Healthcare facility (no name in OSM)',   'healthcare', 8,  nodeMap, '#ef4444'),
      dining:     nearestList(diningElements,     lat, lng, 'Restaurant/cafe (no name in OSM)',       'dining'),
      library:    nearestList(libraryElements,    lat, lng, 'Library (no name in OSM)',               'library',    8,  nodeMap, '#8b5cf6'),
      bank:       nearestList(bankElements,       lat, lng, 'Bank/ATM (no name in OSM)',              'bank'),
      worship:    nearestList(worshipElements,    lat, lng, 'Place of worship (no name in OSM)',      'worship'),
      parking:    nearestList(parkingElements,    lat, lng, 'Parking (no name in OSM)',               'parking'),
    },
  }
}
