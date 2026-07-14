import { Neighborhood } from './types'

// Initial Swiss coverage: the 12 largest Swiss cities as "areas".
// Rents are typical CHF/month for a 1-2 bedroom apartment; scores are 0-100
// relative estimates across the set. Same data structure as before so all
// scoring logic is untouched.
export const SWISS_AREAS: Neighborhood[] = [
  {
    name: 'Zürich',
    lat: 47.3769, lng: 8.5417,
    walkability: 92, air: 72, green: 74, grocery: 90, transit: 98, safety: 85,
    education: 90, healthcare: 92, dining: 95, quiet: 40, rent: 2600,
    notes: ['Largest city', 'Best transit in CH', 'Finance & tech hub', 'Most expensive'],
  },
  {
    name: 'Geneva',
    lat: 46.2044, lng: 6.1432,
    walkability: 88, air: 70, green: 72, grocery: 85, transit: 90, safety: 78,
    education: 88, healthcare: 90, dining: 92, quiet: 42, rent: 2500,
    notes: ['International city', 'Lakeside living', 'UN & NGO hub', 'Very expensive'],
  },
  {
    name: 'Basel',
    lat: 47.5596, lng: 7.5886,
    walkability: 86, air: 68, green: 70, grocery: 82, transit: 88, safety: 80,
    education: 85, healthcare: 90, dining: 82, quiet: 50, rent: 1900,
    notes: ['Pharma capital', 'Rich art scene', 'Tri-border location', 'Rhine swimming'],
  },
  {
    name: 'Lausanne',
    lat: 46.5197, lng: 6.6323,
    walkability: 80, air: 72, green: 76, grocery: 80, transit: 85, safety: 78,
    education: 90, healthcare: 85, dining: 82, quiet: 50, rent: 2000,
    notes: ['Lake Geneva views', 'University city', 'Olympic capital', 'Hilly streets'],
  },
  {
    name: 'Bern',
    lat: 46.9480, lng: 7.4474,
    walkability: 84, air: 76, green: 80, grocery: 80, transit: 86, safety: 86,
    education: 82, healthcare: 85, dining: 78, quiet: 60, rent: 1800,
    notes: ['Federal capital', 'UNESCO old town', 'Aare river', 'Relaxed pace'],
  },
  {
    name: 'Winterthur',
    lat: 47.4988, lng: 8.7237,
    walkability: 78, air: 76, green: 78, grocery: 76, transit: 80, safety: 84,
    education: 78, healthcare: 78, dining: 70, quiet: 65, rent: 1750,
    notes: ['Near Zürich', 'Museums & culture', 'Family friendly', 'Garden city'],
  },
  {
    name: 'Lucerne',
    lat: 47.0502, lng: 8.3093,
    walkability: 80, air: 78, green: 78, grocery: 76, transit: 80, safety: 86,
    education: 75, healthcare: 80, dining: 80, quiet: 58, rent: 1850,
    notes: ['Lake & mountain views', 'Historic center', 'Tourist hotspot', 'High quality of life'],
  },
  {
    name: 'St. Gallen',
    lat: 47.4245, lng: 9.3767,
    walkability: 76, air: 78, green: 76, grocery: 74, transit: 76, safety: 86,
    education: 85, healthcare: 78, dining: 68, quiet: 68, rent: 1500,
    notes: ['University town', 'Abbey district', 'More affordable', 'Eastern hub'],
  },
  {
    name: 'Lugano',
    lat: 46.0037, lng: 8.9511,
    walkability: 74, air: 74, green: 74, grocery: 72, transit: 70, safety: 84,
    education: 72, healthcare: 76, dining: 82, quiet: 60, rent: 1650,
    notes: ['Mediterranean feel', 'Italian-speaking', 'Lakeside', 'Mild climate'],
  },
  {
    name: 'Biel/Bienne',
    lat: 47.1368, lng: 7.2468,
    walkability: 74, air: 76, green: 74, grocery: 72, transit: 76, safety: 78,
    education: 70, healthcare: 74, dining: 66, quiet: 64, rent: 1350,
    notes: ['Most affordable', 'Bilingual city', 'Watchmaking capital', 'Lakeside'],
  },
  {
    name: 'Thun',
    lat: 46.7580, lng: 7.6280,
    walkability: 72, air: 82, green: 82, grocery: 70, transit: 72, safety: 88,
    education: 70, healthcare: 72, dining: 66, quiet: 74, rent: 1550,
    notes: ['Alpine gateway', 'Lake Thun', 'Very safe', 'Outdoor lifestyle'],
  },
  {
    name: 'Fribourg',
    lat: 46.8065, lng: 7.1620,
    walkability: 74, air: 78, green: 76, grocery: 72, transit: 74, safety: 84,
    education: 82, healthcare: 74, dining: 68, quiet: 66, rent: 1400,
    notes: ['Bilingual city', 'Medieval old town', 'University town', 'Affordable'],
  },
]

export interface SwissAverages {
  walkability: number
  grocery: number
  green: number
  transit: number
  safety: number
  healthcare: number
  school: number
  dining: number
}

export function getSwissAverages(): SwissAverages {
  const n = SWISS_AREAS
  const avg = (vals: number[]) => Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  return {
    walkability: avg(n.map(nb => nb.walkability)),
    grocery:     avg(n.map(nb => nb.grocery)),
    green:       avg(n.map(nb => nb.green)),
    transit:     avg(n.map(nb => nb.transit)),
    safety:      avg(n.map(nb => nb.safety)),
    healthcare:  avg(n.map(nb => nb.healthcare)),
    school:      avg(n.map(nb => nb.education)),
    dining:      avg(n.map(nb => nb.dining)),
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export function nearestNeighborhood(lat: number, lng: number): string {
  return nearestArea(lat, lng).name
}

export function nearestArea(lat: number, lng: number): Neighborhood {
  let best = SWISS_AREAS[0]
  let bestDist = haversineKm(lat, lng, best.lat, best.lng)
  for (const n of SWISS_AREAS.slice(1)) {
    const d = haversineKm(lat, lng, n.lat, n.lng)
    if (d < bestDist) { bestDist = d; best = n }
  }
  return best
}
