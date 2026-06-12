export interface GeoLocation {
  lat: number
  lng: number
  formattedAddress: string
}

export interface AmenityScores {
  groceryCount: number
  transitCount: number
  parkCount: number
  schoolCount: number
  healthcareCount: number
  diningCount: number
  gymCount: number
  groceryScore: number
  transitScore: number
  greenScore: number
  schoolScore: number
  healthcareScore: number
  diningScore: number
  gymScore: number
  walkabilityScore: number
  note?: string
}

export interface CrimeResult {
  incidentCount: number
  topIncidentTypes: string[]
  safetyScore: number
  note?: string
}

export interface AddressMetrics {
  id: string
  address: string
  location: GeoLocation
  aqi: number
  aqiCategory: string
  aqiScore: number
  walkabilityScore: number
  groceryScore: number
  transitScore: number
  greenScore: number
  groceryCount: number
  transitCount: number
  parkCount: number
  schoolCount: number
  schoolScore: number
  healthcareCount: number
  healthcareScore: number
  diningCount: number
  diningScore: number
  gymCount: number
  gymScore: number
  crimeIncidentCount: number
  crimeTopTypes: string[]
  safetyScore: number
  safetyNote?: string
  overallScore: number
}

export interface Neighborhood {
  name: string
  walkability: number
  air: number
  green: number
  grocery: number
  transit: number
  safety: number
  education: number
  healthcare: number
  dining: number
  quiet: number
  rent: number
  notes: string[]
}

export interface WeightConfig {
  walkability: number
  air: number
  green: number
  grocery: number
  transit: number
  safety: number
}

export type Profile = 'Family' | 'Young Professional' | 'Retiree' | 'Nature Lover'

export const PROFILE_WEIGHTS: Record<Profile, Record<keyof Omit<Neighborhood, 'name' | 'rent' | 'notes'>, number>> = {
  'Family':            { walkability: 10, air: 10, green: 15, grocery: 10, transit: 5,  safety: 25, education: 25, healthcare: 5,  dining: 0,  quiet: 5  },
  'Young Professional': { walkability: 20, air: 5,  green: 5,  grocery: 10, transit: 25, safety: 10, education: 0,  healthcare: 5,  dining: 20, quiet: 0  },
  'Retiree':           { walkability: 5,  air: 10, green: 20, grocery: 10, transit: 5,  safety: 25, education: 0,  healthcare: 20, dining: 0,  quiet: 5  },
  'Nature Lover':      { walkability: 5,  air: 35, green: 35, grocery: 5,  transit: 5,  safety: 10, education: 0,  healthcare: 0,  dining: 0,  quiet: 5  },
}
