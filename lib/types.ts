export interface GeoLocation {
  lat: number
  lng: number
  formattedAddress: string
}

export interface AmenityScores {
  groceryCount: number
  transitCount: number
  parkCount: number
  groceryScore: number
  transitScore: number
  greenScore: number
  walkabilityScore: number
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
