export interface GeoLocation {
  lat: number
  lng: number
  formattedAddress: string
}

export interface NearestAmenity {
  name: string
  distanceKm: number
  lat?: number
  lng?: number
  category?: string
  polygon?: [number, number][]
  polygonColor?: string
}

export interface CrimeIncidentLocation {
  lat: number
  lng: number
}

export interface AmenityPlaces {
  grocery: NearestAmenity[]
  transit: NearestAmenity[]
  park: NearestAmenity[]
  school: NearestAmenity[]
  healthcare: NearestAmenity[]
  dining: NearestAmenity[]
  library: NearestAmenity[]
  bank: NearestAmenity[]
  worship: NearestAmenity[]
  parking: NearestAmenity[]
}

export interface AmenityScores {
  groceryCount: number
  transitCount: number
  parkCount: number
  schoolCount: number
  healthcareCount: number
  diningCount: number
  gymCount: number
  libraryCount: number
  bankCount: number
  worshipCount: number
  parkingCount: number
  groceryScore: number
  transitScore: number
  greenScore: number
  schoolScore: number
  healthcareScore: number
  diningScore: number
  gymScore: number
  libraryScore: number
  bankScore: number
  worshipScore: number
  parkingScore: number
  walkabilityScore: number
  radius: number
  nearestGrocery: NearestAmenity | null
  nearestPark: NearestAmenity | null
  nearestSchool: NearestAmenity | null
  nearestHealthcare: NearestAmenity | null
  nearestDining: NearestAmenity | null
  nearestLibrary: NearestAmenity | null
  nearestBank: NearestAmenity | null
  nearestWorship: NearestAmenity | null
  nearestParking: NearestAmenity | null
  places: AmenityPlaces
  note?: string
}

export interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: string
}

export interface StateCrimeContext {
  state: string
  rate: number | null
  year?: number
  available: boolean
  message?: string
}

export interface CrimeResult {
  incidentCount: number
  topIncidentTypes: string[]
  safetyScore: number
  note?: string
  incidents?: CrimeIncidentLocation[]
  stateContext?: StateCrimeContext
}

export interface SunlightResult {
  score: number | null
  hoursPerYear: number | null
  available: boolean
  message?: string
}

export interface NoiseRoad {
  name: string
  distanceKm: number
  classification: string
}

export interface NoiseResult {
  score: number | null
  level: string | null
  nearestRoad: NoiseRoad | null
  available: boolean
  message?: string
}

export interface DemographicsResult {
  medianHouseholdIncome: number | null
  totalPopulation: number | null
  medianAge?: number | null
  tract?: string
  available: boolean
  message?: string
}

export interface FBICrimeResult {
  agencyName: string | null
  violentCrimeRate: number | null
  propertyCrimeRate: number | null
  year: number | null
  available: boolean
  message?: string
}

export interface NearestEssentialItem {
  name: string | null
  distanceKm: number
  lat: number
  lng: number
}

export interface NearestEssentials {
  trainStation: NearestEssentialItem | null
  busStop: NearestEssentialItem | null
  grocery: NearestEssentialItem | null
  hospital: NearestEssentialItem | null
  pharmacy: NearestEssentialItem | null
  school: NearestEssentialItem | null
  library: NearestEssentialItem | null
  park: NearestEssentialItem | null
  bank: NearestEssentialItem | null
  dining: NearestEssentialItem | null
  worship: NearestEssentialItem | null
  parking: NearestEssentialItem | null
  searchRadiusKm: number
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
  libraryCount: number
  libraryScore: number
  bankCount: number
  bankScore: number
  worshipCount: number
  worshipScore: number
  parkingCount: number
  parkingScore: number
  crimeIncidentCount: number
  crimeTopTypes: string[]
  safetyScore: number
  safetyNote?: string
  overallScore: number
  radius: number
  nearestGrocery: NearestAmenity | null
  nearestPark: NearestAmenity | null
  nearestSchool: NearestAmenity | null
  nearestHealthcare: NearestAmenity | null
  nearestDining: NearestAmenity | null
  nearestLibrary: NearestAmenity | null
  nearestBank: NearestAmenity | null
  nearestWorship: NearestAmenity | null
  nearestParking: NearestAmenity | null
  places: AmenityPlaces
  fetchedAt: string
  crimeIncidents?: CrimeIncidentLocation[]
  stateCrimeContext?: StateCrimeContext
  sunlight?: SunlightResult
  noise?: NoiseResult
  demographics?: DemographicsResult
  censusData?: DemographicsResult
  fbiCrime?: FBICrimeResult
  nearestEssentials?: NearestEssentials
  columbusAqi?: number
}

export interface SavedAddress {
  id: string
  user_id: string
  address: string
  lat: number
  lng: number
  metrics: AddressMetrics
  created_at: string
}

export interface Neighborhood {
  name: string
  lat: number
  lng: number
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

export interface AiRentListing {
  id: string
  formattedAddress: string
  price: number
  bedrooms?: number
  bathrooms?: number
  squareFootage?: number
  propertyType?: string
  daysOnMarket?: number
  listingAgent?: { website?: string }
  listingOffice?: { website?: string }
}

export interface AiMatchListingsState {
  neighborhood: string
  status: 'loading' | 'ok' | 'empty' | 'error'
  listings: AiRentListing[]
}

export const PROFILE_WEIGHTS: Record<Profile, Record<keyof Omit<Neighborhood, 'name' | 'lat' | 'lng' | 'rent' | 'notes'>, number>> = {
  'Family':            { walkability: 10, air: 10, green: 15, grocery: 10, transit: 5,  safety: 25, education: 25, healthcare: 5,  dining: 0,  quiet: 5  },
  'Young Professional': { walkability: 20, air: 5,  green: 5,  grocery: 10, transit: 25, safety: 10, education: 0,  healthcare: 5,  dining: 20, quiet: 0  },
  'Retiree':           { walkability: 5,  air: 10, green: 20, grocery: 10, transit: 5,  safety: 25, education: 0,  healthcare: 20, dining: 0,  quiet: 5  },
  'Nature Lover':      { walkability: 5,  air: 35, green: 35, grocery: 5,  transit: 5,  safety: 10, education: 0,  healthcare: 0,  dining: 0,  quiet: 5  },
}
