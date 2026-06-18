import { Neighborhood } from './types'

export const COLUMBUS_NEIGHBORHOODS: Neighborhood[] = [
  {
    name: 'German Village',
    lat: 39.9509, lng: -82.9959,
    walkability: 83, air: 78, green: 82, grocery: 70, transit: 58, safety: 78,
    education: 65, healthcare: 70, dining: 85, quiet: 60, rent: 1650,
    notes: ['Historic brick streets', 'Beautiful parks', 'High walkability', 'Good air quality'],
  },
  {
    name: 'Clintonville',
    lat: 40.0334, lng: -83.0094,
    walkability: 68, air: 82, green: 88, grocery: 78, transit: 52, safety: 82,
    education: 78, healthcare: 65, dining: 70, quiet: 72, rent: 1350,
    notes: ['Excellent air quality', 'Most green space', 'Family friendly', 'Very affordable'],
  },
  {
    name: 'Grandview Heights',
    lat: 39.9764, lng: -83.0316,
    walkability: 76, air: 79, green: 70, grocery: 80, transit: 52, safety: 88,
    education: 85, healthcare: 72, dining: 80, quiet: 68, rent: 1600,
    notes: ['Very safe', 'Great grocery access', 'Good restaurants', 'Family friendly'],
  },
  {
    name: 'Bexley',
    lat: 39.9690, lng: -82.9377,
    walkability: 63, air: 86, green: 88, grocery: 72, transit: 42, safety: 90,
    education: 92, healthcare: 75, dining: 65, quiet: 78, rent: 1700,
    notes: ['Excellent safety', 'Best air quality', 'Beautiful parks', 'Suburban feel'],
  },
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
    name: 'Westerville',
    lat: 40.1262, lng: -82.9291,
    walkability: 48, air: 88, green: 80, grocery: 76, transit: 28, safety: 92,
    education: 90, healthcare: 70, dining: 55, quiet: 82, rent: 1550,
    notes: ['Very safe', 'Clean air', 'Suburban', 'Car required'],
  },
  {
    name: 'Dublin',
    lat: 40.0992, lng: -83.1141,
    walkability: 42, air: 90, green: 84, grocery: 78, transit: 28, safety: 94,
    education: 95, healthcare: 78, dining: 60, quiet: 85, rent: 1900,
    notes: ['Cleanest air', 'Safest area', 'Suburban', 'Car required'],
  },
  {
    name: 'Franklinton',
    lat: 39.9614, lng: -83.0197,
    walkability: 52, air: 52, green: 45, grocery: 50, transit: 68, safety: 42,
    education: 45, healthcare: 50, dining: 60, quiet: 45, rent: 950,
    notes: ['Most affordable', 'Arts district', 'Improving rapidly', 'Lower safety scores'],
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
