import { Neighborhood } from './types'

export const COLUMBUS_NEIGHBORHOODS: Neighborhood[] = [
  // ── Inner ring / walkable neighborhoods ───────────────────────────────────
  {
    name: 'Short North',
    lat: 39.9784, lng: -83.0042,
    walkability: 88, air: 68, green: 60, grocery: 82, transit: 75, safety: 55,
    education: 55, healthcare: 70, dining: 95, quiet: 30, rent: 1800,
    notes: ['Most walkable', 'Best transit', 'Vibrant nightlife', 'Higher rent'],
  },
  {
    name: 'Victorian Village',
    lat: 39.9743, lng: -83.0073,
    walkability: 79, air: 76, green: 80, grocery: 68, transit: 58, safety: 72,
    education: 60, healthcare: 68, dining: 78, quiet: 58, rent: 1500,
    notes: ['Historic homes', 'Good green space', 'Near OSU', 'Quiet streets'],
  },
  {
    name: 'Italian Village',
    lat: 39.9777, lng: -82.9989,
    walkability: 76, air: 63, green: 55, grocery: 70, transit: 70, safety: 60,
    education: 55, healthcare: 62, dining: 82, quiet: 40, rent: 1400,
    notes: ['Near downtown', 'Good transit', 'Trendy & growing', 'Limited green space'],
  },
  {
    name: 'German Village',
    lat: 39.9509, lng: -82.9959,
    walkability: 83, air: 78, green: 82, grocery: 70, transit: 58, safety: 78,
    education: 65, healthcare: 70, dining: 85, quiet: 60, rent: 1650,
    notes: ['Historic brick streets', 'Beautiful parks', 'High walkability', 'Good air quality'],
  },
  {
    name: 'Harrison West',
    lat: 39.9782, lng: -83.0234,
    walkability: 72, air: 74, green: 72, grocery: 65, transit: 55, safety: 70,
    education: 62, healthcare: 65, dining: 72, quiet: 68, rent: 1350,
    notes: ['Quiet residential', 'Near OSU & Short North', 'Good green space', 'Walkable'],
  },
  {
    name: 'Weinland Park',
    lat: 40.0003, lng: -83.0080,
    walkability: 68, air: 68, green: 60, grocery: 60, transit: 62, safety: 48,
    education: 50, healthcare: 58, dining: 65, quiet: 45, rent: 1050,
    notes: ['Redeveloping rapidly', 'Near OSU', 'Affordable', 'Improving safety'],
  },
  {
    name: 'Franklinton',
    lat: 39.9614, lng: -83.0197,
    walkability: 52, air: 52, green: 45, grocery: 50, transit: 68, safety: 42,
    education: 45, healthcare: 50, dining: 60, quiet: 45, rent: 950,
    notes: ['Most affordable', 'Arts district', 'Improving rapidly', 'Lower safety scores'],
  },
  {
    name: 'Milo-Grogan',
    lat: 39.9851, lng: -82.9900,
    walkability: 62, air: 60, green: 48, grocery: 55, transit: 65, safety: 50,
    education: 48, healthcare: 55, dining: 62, quiet: 42, rent: 1100,
    notes: ['Just north of downtown', 'Arts community', 'Improving', 'Affordable'],
  },
  {
    name: 'Downtown Columbus',
    lat: 39.9612, lng: -82.9988,
    walkability: 82, air: 62, green: 45, grocery: 65, transit: 80, safety: 50,
    education: 45, healthcare: 75, dining: 90, quiet: 25, rent: 1850,
    notes: ['Best transit access', 'Restaurants & bars', 'No green space', 'Loud'],
  },

  // ── University District area ───────────────────────────────────────────────
  {
    name: 'University District',
    lat: 40.0070, lng: -83.0144,
    walkability: 75, air: 65, green: 62, grocery: 72, transit: 68, safety: 52,
    education: 72, healthcare: 65, dining: 78, quiet: 38, rent: 1100,
    notes: ['OSU campus area', 'Dense & walkable', 'Young crowd', 'Affordable'],
  },

  // ── South Columbus ─────────────────────────────────────────────────────────
  {
    name: 'Merion Village',
    lat: 39.9422, lng: -82.9960,
    walkability: 60, air: 74, green: 72, grocery: 62, transit: 48, safety: 68,
    education: 58, healthcare: 58, dining: 65, quiet: 65, rent: 1150,
    notes: ['Quiet south Columbus', 'Good green space', 'Improving area', 'Affordable'],
  },
  {
    name: 'Driving Park',
    lat: 39.9497, lng: -82.9713,
    walkability: 45, air: 65, green: 58, grocery: 52, transit: 52, safety: 42,
    education: 42, healthcare: 50, dining: 48, quiet: 48, rent: 900,
    notes: ['Affordable', 'South of German Village', 'Transitional area', 'Urban feel'],
  },

  // ── East Columbus ──────────────────────────────────────────────────────────
  {
    name: 'Olde Towne East',
    lat: 39.9607, lng: -82.9704,
    walkability: 62, air: 68, green: 70, grocery: 58, transit: 60, safety: 58,
    education: 52, healthcare: 60, dining: 68, quiet: 52, rent: 1200,
    notes: ['Historic Victorian homes', 'Gentrifying', 'Near downtown', 'Improving'],
  },
  {
    name: 'Bexley',
    lat: 39.9690, lng: -82.9377,
    walkability: 63, air: 86, green: 88, grocery: 72, transit: 42, safety: 90,
    education: 92, healthcare: 75, dining: 65, quiet: 78, rent: 1700,
    notes: ['Excellent safety', 'Best air quality', 'Beautiful parks', 'Suburban feel'],
  },
  {
    name: 'Berwick',
    lat: 39.9517, lng: -82.9276,
    walkability: 45, air: 78, green: 65, grocery: 58, transit: 38, safety: 62,
    education: 55, healthcare: 52, dining: 48, quiet: 65, rent: 1050,
    notes: ['Quiet east-side', 'Affordable', 'Family homes', 'Near Bexley'],
  },
  {
    name: 'Eastmoor',
    lat: 39.9569, lng: -82.9105,
    walkability: 45, air: 80, green: 68, grocery: 65, transit: 35, safety: 68,
    education: 60, healthcare: 56, dining: 52, quiet: 70, rent: 1150,
    notes: ['Quiet east-side', 'Good air quality', 'Established neighborhood', 'Mid-range'],
  },
  {
    name: 'Whitehall',
    lat: 39.9659, lng: -82.8905,
    walkability: 45, air: 72, green: 60, grocery: 65, transit: 42, safety: 52,
    education: 50, healthcare: 55, dining: 52, quiet: 58, rent: 1000,
    notes: ['East suburb', 'Affordable', 'Working class', 'Convenient location'],
  },
  {
    name: 'Blacklick',
    lat: 39.9631, lng: -82.8424,
    walkability: 35, air: 80, green: 68, grocery: 60, transit: 20, safety: 72,
    education: 62, healthcare: 52, dining: 45, quiet: 72, rent: 1200,
    notes: ['Outer east suburb', 'Car required', 'Good air quality', 'Family-friendly'],
  },
  {
    name: 'Pickerington',
    lat: 39.9012, lng: -82.7541,
    walkability: 35, air: 84, green: 72, grocery: 68, transit: 12, safety: 82,
    education: 80, healthcare: 58, dining: 50, quiet: 80, rent: 1400,
    notes: ['Growing suburb', 'Good schools', 'Car required', 'New construction'],
  },
  {
    name: 'Reynoldsburg',
    lat: 39.9548, lng: -82.7999,
    walkability: 42, air: 78, green: 65, grocery: 70, transit: 22, safety: 74,
    education: 68, healthcare: 60, dining: 58, quiet: 72, rent: 1150,
    notes: ['Diverse east suburb', 'Affordable', 'Good grocery access', 'Car-dependent'],
  },
  {
    name: 'Gahanna',
    lat: 40.0173, lng: -82.8693,
    walkability: 42, air: 82, green: 74, grocery: 72, transit: 20, safety: 88,
    education: 82, healthcare: 68, dining: 60, quiet: 78, rent: 1450,
    notes: ['Safe east suburb', 'Good schools', 'Clean air', 'Family-friendly'],
  },
  {
    name: 'New Albany',
    lat: 40.0812, lng: -82.8029,
    walkability: 35, air: 88, green: 80, grocery: 65, transit: 15, safety: 96,
    education: 95, healthcare: 70, dining: 55, quiet: 88, rent: 2200,
    notes: ['Safest area', 'Top schools', 'Planned community', 'Very affluent'],
  },

  // ── North Columbus ─────────────────────────────────────────────────────────
  {
    name: 'Clintonville',
    lat: 40.0334, lng: -83.0094,
    walkability: 68, air: 82, green: 88, grocery: 78, transit: 52, safety: 82,
    education: 78, healthcare: 65, dining: 70, quiet: 72, rent: 1350,
    notes: ['Excellent air quality', 'Most green space', 'Family friendly', 'Very affordable'],
  },
  {
    name: 'Linden',
    lat: 40.0189, lng: -82.9756,
    walkability: 48, air: 62, green: 55, grocery: 52, transit: 55, safety: 38,
    education: 42, healthcare: 52, dining: 48, quiet: 42, rent: 850,
    notes: ['Most affordable', 'Urban north', 'Improving with investment', 'Lower safety'],
  },
  {
    name: 'Worthington',
    lat: 40.0931, lng: -83.0179,
    walkability: 55, air: 86, green: 78, grocery: 74, transit: 25, safety: 90,
    education: 88, healthcare: 72, dining: 65, quiet: 82, rent: 1750,
    notes: ['Charming old town', 'Great schools', 'Safe', 'Clean air'],
  },
  {
    name: 'Powell',
    lat: 40.1579, lng: -83.0741,
    walkability: 38, air: 90, green: 82, grocery: 70, transit: 12, safety: 96,
    education: 95, healthcare: 75, dining: 58, quiet: 88, rent: 2100,
    notes: ['Cleanest air', 'Safest suburb', 'Top schools', 'Affluent community'],
  },
  {
    name: 'Westerville',
    lat: 40.1262, lng: -82.9291,
    walkability: 48, air: 88, green: 80, grocery: 76, transit: 28, safety: 92,
    education: 90, healthcare: 70, dining: 55, quiet: 82, rent: 1550,
    notes: ['Very safe', 'Clean air', 'Suburban', 'Car required'],
  },

  // ── West Columbus ──────────────────────────────────────────────────────────
  {
    name: 'Upper Arlington',
    lat: 39.9870, lng: -83.0613,
    walkability: 45, air: 84, green: 82, grocery: 72, transit: 22, safety: 92,
    education: 95, healthcare: 75, dining: 62, quiet: 80, rent: 2100,
    notes: ['Top-rated schools', 'Beautiful parks', 'Very safe', 'Affluent suburb'],
  },
  {
    name: 'Grandview Heights',
    lat: 39.9764, lng: -83.0316,
    walkability: 76, air: 79, green: 70, grocery: 80, transit: 52, safety: 88,
    education: 85, healthcare: 72, dining: 80, quiet: 68, rent: 1600,
    notes: ['Very safe', 'Great grocery access', 'Good restaurants', 'Family friendly'],
  },
  {
    name: 'Hilliard',
    lat: 39.9339, lng: -83.1513,
    walkability: 40, air: 84, green: 72, grocery: 74, transit: 18, safety: 88,
    education: 82, healthcare: 68, dining: 58, quiet: 80, rent: 1500,
    notes: ['West suburb', 'Good schools', 'Growing fast', 'Car required'],
  },
  {
    name: 'Hilltop',
    lat: 39.9648, lng: -83.0700,
    walkability: 52, air: 62, green: 52, grocery: 58, transit: 55, safety: 40,
    education: 45, healthcare: 50, dining: 52, quiet: 48, rent: 900,
    notes: ['Affordable west side', 'Working class', 'Improving area', 'Urban feel'],
  },
  {
    name: 'Dublin',
    lat: 40.0992, lng: -83.1141,
    walkability: 42, air: 90, green: 84, grocery: 78, transit: 28, safety: 94,
    education: 95, healthcare: 78, dining: 60, quiet: 85, rent: 1900,
    notes: ['Cleanest air', 'Safest area', 'Suburban', 'Car required'],
  },

  // ── Southwest Columbus ─────────────────────────────────────────────────────
  {
    name: 'Grove City',
    lat: 39.8812, lng: -83.0957,
    walkability: 42, air: 80, green: 70, grocery: 70, transit: 20, safety: 84,
    education: 75, healthcare: 62, dining: 55, quiet: 76, rent: 1250,
    notes: ['Southwest suburb', 'Affordable', 'Family-oriented', 'Good community'],
  },
  {
    name: 'Canal Winchester',
    lat: 39.8454, lng: -82.8011,
    walkability: 32, air: 84, green: 72, grocery: 58, transit: 10, safety: 82,
    education: 72, healthcare: 50, dining: 42, quiet: 82, rent: 1200,
    notes: ['Charming small town feel', 'Clean air', 'Very quiet', 'Car required'],
  },
]

export interface ColumbusAverages {
  walkability: number
  grocery: number
  green: number
  transit: number
  safety: number
  healthcare: number
  school: number
  dining: number
}

export function getColumbusAverages(): ColumbusAverages {
  const n = COLUMBUS_NEIGHBORHOODS
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
  let best = COLUMBUS_NEIGHBORHOODS[0]
  let bestDist = haversineKm(lat, lng, best.lat, best.lng)
  for (const n of COLUMBUS_NEIGHBORHOODS.slice(1)) {
    const d = haversineKm(lat, lng, n.lat, n.lng)
    if (d < bestDist) { bestDist = d; best = n }
  }
  return best.name
}
