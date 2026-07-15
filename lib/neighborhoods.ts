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

// ── District-level areas ─────────────────────────────────────────────────────
// Official city districts for the three largest cities. Center coordinates are
// the OSM administrative-boundary centers (verified via Nominatim). Rents are
// realistic relative CHF/month tiers within each city; scores are relative
// estimates on the same 0-100 scale as the cities.

export const SWISS_DISTRICTS: Neighborhood[] = [
  // ── Zürich: the 12 Stadtkreise ─────────────────────────────────────────────
  {
    name: 'Kreis 1 (Altstadt)', parent: 'Zürich',
    lat: 47.3722, lng: 8.5423,
    walkability: 98, air: 66, green: 55, grocery: 88, transit: 99, safety: 82,
    education: 85, healthcare: 90, dining: 99, quiet: 25, rent: 3200,
    notes: ['City center', 'Lake & old town', 'Premium shopping', 'Loud & busy'],
  },
  {
    name: 'Kreis 2 (Enge/Wollishofen)', parent: 'Zürich',
    lat: 47.3453, lng: 8.5336,
    walkability: 82, air: 78, green: 82, grocery: 80, transit: 88, safety: 88,
    education: 85, healthcare: 85, dining: 78, quiet: 62, rent: 2700,
    notes: ['Lakeside parks', 'Museums', 'Family friendly', 'Good schools'],
  },
  {
    name: 'Kreis 3 (Wiedikon)', parent: 'Zürich',
    lat: 47.3663, lng: 8.5107,
    walkability: 85, air: 72, green: 70, grocery: 85, transit: 90, safety: 82,
    education: 80, healthcare: 82, dining: 85, quiet: 50, rent: 2400,
    notes: ['Trendy Idaplatz', 'Multicultural', 'Good value', 'Near the Sihl'],
  },
  {
    name: 'Kreis 4 (Aussersihl)', parent: 'Zürich',
    lat: 47.3787, lng: 8.5212,
    walkability: 94, air: 62, green: 50, grocery: 92, transit: 95, safety: 65,
    education: 72, healthcare: 82, dining: 97, quiet: 25, rent: 2500,
    notes: ['Nightlife hub', 'Langstrasse', 'Best dining density', 'Gritty & loud'],
  },
  {
    name: 'Kreis 5 (Industriequartier)', parent: 'Zürich',
    lat: 47.3875, lng: 8.5206,
    walkability: 92, air: 64, green: 55, grocery: 85, transit: 94, safety: 72,
    education: 72, healthcare: 80, dining: 92, quiet: 30, rent: 2600,
    notes: ['Converted industrial', 'Hip & modern', 'Viadukt arches', 'Young crowd'],
  },
  {
    name: 'Kreis 6 (Unterstrass/Oberstrass)', parent: 'Zürich',
    lat: 47.3886, lng: 8.5444,
    walkability: 86, air: 74, green: 72, grocery: 82, transit: 92, safety: 88,
    education: 95, healthcare: 88, dining: 78, quiet: 58, rent: 2700,
    notes: ['University quarter', 'Near Irchel park', 'Academic vibe', 'Residential calm'],
  },
  {
    name: 'Kreis 7 (Hottingen/Fluntern/Witikon)', parent: 'Zürich',
    lat: 47.3712, lng: 8.5767,
    walkability: 72, air: 84, green: 88, grocery: 70, transit: 82, safety: 92,
    education: 92, healthcare: 88, dining: 65, quiet: 75, rent: 2900,
    notes: ['Zürichberg villas', 'Forest at doorstep', 'Prestigious schools', 'Quiet & green'],
  },
  {
    name: 'Kreis 8 (Riesbach/Seefeld)', parent: 'Zürich',
    lat: 47.3575, lng: 8.5599,
    walkability: 88, air: 76, green: 75, grocery: 82, transit: 90, safety: 88,
    education: 85, healthcare: 85, dining: 90, quiet: 55, rent: 3000,
    notes: ['Seefeld lakeside', 'Chic cafes', 'Summer beach vibes', 'Expensive'],
  },
  {
    name: 'Kreis 9 (Altstetten/Albisrieden)', parent: 'Zürich',
    lat: 47.3810, lng: 8.4799,
    walkability: 76, air: 72, green: 68, grocery: 80, transit: 86, safety: 78,
    education: 75, healthcare: 78, dining: 72, quiet: 55, rent: 2200,
    notes: ['Fast developing', 'Good value', 'S-Bahn hub', 'Family options'],
  },
  {
    name: 'Kreis 10 (Höngg/Wipkingen)', parent: 'Zürich',
    lat: 47.4047, lng: 8.5040,
    walkability: 78, air: 78, green: 80, grocery: 76, transit: 84, safety: 86,
    education: 82, healthcare: 80, dining: 72, quiet: 65, rent: 2400,
    notes: ['Limmat riverside', 'Village feel in Höngg', 'Family friendly', 'Good balance'],
  },
  {
    name: 'Kreis 11 (Oerlikon/Seebach/Affoltern)', parent: 'Zürich',
    lat: 47.4169, lng: 8.5299,
    walkability: 80, air: 70, green: 68, grocery: 82, transit: 92, safety: 76,
    education: 78, healthcare: 82, dining: 75, quiet: 50, rent: 2100,
    notes: ['Affordable', 'Oerlikon hub', 'New developments', 'Well connected'],
  },
  {
    name: 'Kreis 12 (Schwamendingen)', parent: 'Zürich',
    lat: 47.4050, lng: 8.5724,
    walkability: 70, air: 68, green: 70, grocery: 72, transit: 82, safety: 70,
    education: 70, healthcare: 72, dining: 62, quiet: 60, rent: 1900,
    notes: ['Most affordable Kreis', 'Green courtyards', 'Improving area', 'Diverse community'],
  },

  // ── Geneva: the main quartiers ─────────────────────────────────────────────
  {
    name: 'Cité-Centre', parent: 'Geneva',
    lat: 46.2010, lng: 6.1462,
    walkability: 96, air: 66, green: 55, grocery: 85, transit: 95, safety: 78,
    education: 85, healthcare: 90, dining: 96, quiet: 28, rent: 3000,
    notes: ['Old town', 'Lakefront', 'Luxury shopping', 'Tourist crowds'],
  },
  {
    name: 'Saint-Gervais/Grottes', parent: 'Geneva',
    lat: 46.2085, lng: 6.1410,
    walkability: 92, air: 64, green: 55, grocery: 88, transit: 96, safety: 70,
    education: 78, healthcare: 85, dining: 88, quiet: 35, rent: 2300,
    notes: ['Behind Cornavin', 'Bohemian Grottes', 'Best connections', 'Lively'],
  },
  {
    name: 'Pâquis', parent: 'Geneva',
    lat: 46.2122, lng: 6.1487,
    walkability: 94, air: 62, green: 50, grocery: 90, transit: 92, safety: 60,
    education: 75, healthcare: 85, dining: 95, quiet: 25, rent: 2300,
    notes: ['Multicultural', 'Bains des Pâquis', 'Dense & vibrant', 'Noisy nightlife'],
  },
  {
    name: 'Eaux-Vives', parent: 'Geneva',
    lat: 46.2040, lng: 6.1616,
    walkability: 90, air: 72, green: 74, grocery: 86, transit: 88, safety: 80,
    education: 85, healthcare: 86, dining: 90, quiet: 45, rent: 2800,
    notes: ['Lakeside park', 'New CEVA station', 'Chic cafes', 'Sought after'],
  },
  {
    name: 'Champel', parent: 'Geneva',
    lat: 46.1928, lng: 6.1536,
    walkability: 78, air: 78, green: 80, grocery: 76, transit: 82, safety: 90,
    education: 90, healthcare: 95, dining: 72, quiet: 70, rent: 2900,
    notes: ['Leafy & residential', 'Near HUG hospital', 'Prestigious', 'Quiet streets'],
  },
  {
    name: 'Plainpalais/Jonction', parent: 'Geneva',
    lat: 46.1990, lng: 6.1360,
    walkability: 90, air: 68, green: 65, grocery: 85, transit: 90, safety: 72,
    education: 88, healthcare: 85, dining: 88, quiet: 38, rent: 2500,
    notes: ['Flea market', 'Student quarter', 'Museums', 'Buzzing'],
  },
  {
    name: 'Servette/Petit-Saconnex', parent: 'Geneva',
    lat: 46.2129, lng: 6.1312,
    walkability: 82, air: 70, green: 68, grocery: 82, transit: 88, safety: 76,
    education: 80, healthcare: 82, dining: 78, quiet: 50, rent: 2200,
    notes: ['More affordable', 'Residential', 'Good transit', 'Local shops'],
  },
  {
    name: 'Saint-Jean/Charmilles', parent: 'Geneva',
    lat: 46.2043, lng: 6.1261,
    walkability: 80, air: 72, green: 70, grocery: 78, transit: 84, safety: 78,
    education: 78, healthcare: 80, dining: 74, quiet: 55, rent: 2300,
    notes: ['Rhône walkways', 'Family friendly', 'Improving', 'Good value'],
  },

  // ── Basel: the main official quarters ──────────────────────────────────────
  {
    name: 'Altstadt Grossbasel', parent: 'Basel',
    lat: 47.5564, lng: 7.5883,
    walkability: 96, air: 68, green: 55, grocery: 82, transit: 94, safety: 84,
    education: 85, healthcare: 90, dining: 92, quiet: 35, rent: 2400,
    notes: ['Historic center', 'Marktplatz', 'Car-free lanes', 'Premium location'],
  },
  {
    name: 'Altstadt Kleinbasel', parent: 'Basel',
    lat: 47.5607, lng: 7.5934,
    walkability: 94, air: 66, green: 55, grocery: 82, transit: 92, safety: 76,
    education: 80, healthcare: 86, dining: 90, quiet: 35, rent: 2100,
    notes: ['Rhine promenade', 'Summer buvettes', 'Lively', 'Central'],
  },
  {
    name: 'St. Alban', parent: 'Basel',
    lat: 47.5496, lng: 7.6051,
    walkability: 82, air: 74, green: 76, grocery: 74, transit: 84, safety: 88,
    education: 88, healthcare: 86, dining: 74, quiet: 65, rent: 2300,
    notes: ['Museum quarter', 'Rhine swimming', 'Elegant', 'Quiet'],
  },
  {
    name: 'Wettstein', parent: 'Basel',
    lat: 47.5605, lng: 7.6048,
    walkability: 84, air: 72, green: 72, grocery: 78, transit: 88, safety: 84,
    education: 84, healthcare: 90, dining: 76, quiet: 58, rent: 2000,
    notes: ['Near Roche campus', 'Rhine access', 'Residential', 'Solid choice'],
  },
  {
    name: 'Am Ring', parent: 'Basel',
    lat: 47.5588, lng: 7.5775,
    walkability: 88, air: 70, green: 68, grocery: 80, transit: 90, safety: 82,
    education: 88, healthcare: 88, dining: 80, quiet: 50, rent: 1900,
    notes: ['University nearby', 'Ring boulevards', 'Central & calm', 'Good mix'],
  },
  {
    name: 'St. Johann', parent: 'Basel',
    lat: 47.5691, lng: 7.5759,
    walkability: 84, air: 66, green: 66, grocery: 80, transit: 88, safety: 74,
    education: 78, healthcare: 90, dining: 78, quiet: 45, rent: 1800,
    notes: ['Novartis campus', 'Rhine park', 'Multicultural', 'Affordable'],
  },
  {
    name: 'Gundeldingen', parent: 'Basel',
    lat: 47.5432, lng: 7.5915,
    walkability: 86, air: 66, green: 60, grocery: 84, transit: 90, safety: 74,
    education: 78, healthcare: 82, dining: 80, quiet: 45, rent: 1700,
    notes: ['Behind SBB station', 'Dense & diverse', 'Cafes & bakeries', 'Good value'],
  },
  {
    name: 'Breite', parent: 'Basel',
    lat: 47.5518, lng: 7.6179,
    walkability: 78, air: 70, green: 68, grocery: 76, transit: 82, safety: 80,
    education: 78, healthcare: 80, dining: 70, quiet: 60, rent: 1800,
    notes: ['Rhine access', 'Residential', 'Near St. Alban', 'Understated'],
  },
  {
    name: 'Matthäus', parent: 'Basel',
    lat: 47.5674, lng: 7.5915,
    walkability: 90, air: 64, green: 55, grocery: 84, transit: 88, safety: 68,
    education: 74, healthcare: 80, dining: 84, quiet: 38, rent: 1600,
    notes: ['Hippest quarter', 'Markthalle vibes', 'Dense & young', 'Noisy corners'],
  },
  {
    name: 'Klybeck', parent: 'Basel',
    lat: 47.5768, lng: 7.5901,
    walkability: 80, air: 60, green: 58, grocery: 76, transit: 84, safety: 64,
    education: 70, healthcare: 76, dining: 74, quiet: 42, rent: 1500,
    notes: ['Most affordable', 'Transforming docklands', 'Creative scene', 'Rough edges'],
  },
  {
    name: 'Bruderholz', parent: 'Basel',
    lat: 47.5308, lng: 7.5916,
    walkability: 62, air: 82, green: 88, grocery: 62, transit: 72, safety: 92,
    education: 88, healthcare: 88, dining: 55, quiet: 85, rent: 2200,
    notes: ['Villa quarter', 'Green hilltop', 'Very quiet', 'Car helpful'],
  },
]

// All areas by name (cities + districts) — for lookups and search
export const ALL_AREAS: Neighborhood[] = [...SWISS_AREAS, ...SWISS_DISTRICTS]

// The finest-grained area set: districts where a city has them, otherwise the
// city itself. Used for AI matching, nearest-area assignment, and rent estimates.
const CITIES_WITH_DISTRICTS = new Set(SWISS_DISTRICTS.map(d => d.parent as string))
export const MATCHABLE_AREAS: Neighborhood[] = [
  ...SWISS_AREAS.filter(c => !CITIES_WITH_DISTRICTS.has(c.name)),
  ...SWISS_DISTRICTS,
]

export function getDistricts(cityName: string): Neighborhood[] {
  return SWISS_DISTRICTS.filter(d => d.parent === cityName)
}

export function hasDistricts(cityName: string): boolean {
  return CITIES_WITH_DISTRICTS.has(cityName)
}

/** Display name including the parent city for districts, e.g. "Kreis 1 (Altstadt), Zürich" */
export function areaDisplayName(n: Neighborhood): string {
  return n.parent ? `${n.name}, ${n.parent}` : n.name
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

function nearestOf(areas: Neighborhood[], lat: number, lng: number): Neighborhood {
  let best = areas[0]
  let bestDist = haversineKm(lat, lng, best.lat, best.lng)
  for (const n of areas.slice(1)) {
    const d = haversineKm(lat, lng, n.lat, n.lng)
    if (d < bestDist) { bestDist = d; best = n }
  }
  return best
}

/** Nearest area at the finest granularity (district where available). */
export function nearestNeighborhood(lat: number, lng: number): string {
  return nearestOf(MATCHABLE_AREAS, lat, lng).name
}

/** Nearest of the 12 top-level cities (used e.g. as the AQI reference point). */
export function nearestArea(lat: number, lng: number): Neighborhood {
  return nearestOf(SWISS_AREAS, lat, lng)
}

/** Nearest finest-grained area (district where available), full record. */
export function nearestMatchableArea(lat: number, lng: number): Neighborhood {
  return nearestOf(MATCHABLE_AREAS, lat, lng)
}
