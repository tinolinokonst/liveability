import type { RadonResult } from './radon'
import type { CountryCode } from './country'

export interface GeoLocation {
  lat: number
  lng: number
  formattedAddress: string
  /** From the geocoder; absent on data saved before US support (= Switzerland) */
  country?: CountryCode
  /** US addresses only: Census geographies every US data provider keys off */
  us?: UsGeography | null
}

/** Census Bureau geographies for a US address (Census Geocoder, current vintage) */
export interface UsGeography {
  stateFips: string     // 2 digits, e.g. "11"
  stateAbbr: string     // "DC"
  stateName: string
  countyFips: string    // 3 digits within the state, e.g. "001"
  countyName: string
  tractFips: string     // 6 digits within the county, e.g. "980000"
  tractName: string     // "Census Tract 9800"
  /** state + county + tract, 11 digits — the key for tract-level ACS data */
  tractGeoid: string
}

export interface NearestAmenity {
  name: string
  distanceKm: number
  lat?: number
  lng?: number
  category?: string
  polygon?: [number, number][]
  polygonColor?: string
  popupLines?: string[]
}

export interface TransitDeparture {
  line: string
  to: string
  time: string // ISO timestamp
  delay: number | null
}

export interface TransitStation {
  id: string
  name: string
  distanceM: number
  lat: number
  lng: number
  icon: string | null
  departures: TransitDeparture[]
}

export interface TransitCHResult {
  available: boolean
  score: number | null
  stationCount: number
  radiusM?: number
  departuresNextHour?: number
  nearest: TransitStation | null
  stations: TransitStation[]
  source?: string
  message?: string
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
  db?: number | null
  dbNight?: number | null
  source?: string
}

/**
 * Commune-level context for an address. Currently resolved from swisstopo's
 * swissBOUNDARIES3D; the population/age/income fields are placeholders for the
 * pending Swiss Federal Statistical Office integration and are null for now.
 */
export interface DemographicsResult {
  medianHouseholdIncome: number | null
  totalPopulation: number | null
  medianAge?: number | null
  commune?: string
  canton?: string
  bfsNumber?: number
  source?: string
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

// ─── Risks (cantonal hazard maps + contaminated-site cadastres) ─────────────

/** Swiss hazard-map zones: white, yellow-white hatched, yellow, blue, red */
export type HazardZone = 'none' | 'residual' | 'low' | 'medium' | 'high'
/** Reported level. Residual (yellow-white) counts as 'none'; see zone for which. */
export type HazardLevel = 'none' | 'low' | 'medium' | 'high'
export type HazardType = 'flood' | 'landslide' | 'rockfall' | 'avalanche'

export interface HazardProcess {
  type: HazardType
  /** 'not_mapped': the canton did not assess this process at this location */
  zone: HazardZone | 'not_mapped'
}

/** Attribution for one canton's data, shown in the card's modal */
export interface RiskSourceCredit {
  label: string
  url: string
}

export type RiskStatus =
  | 'ok'
  | 'not_mapped'          // hazards only: outside the canton's surveyed area
  | 'unavailable_canton'  // canton's terms don't allow us to use it
  | 'error'               // upstream failure or fair-use limit; retry later

export interface HazardResult {
  status: RiskStatus
  canton?: string
  cantonName?: string
  /** Worst level across the processes; null unless status is 'ok' */
  level: HazardLevel | null
  /** Worst zone, so a 'none' level can still say "residual hazard" */
  zone: HazardZone | null
  processes: HazardProcess[]
  credits: RiskSourceCredit[]
  message?: string
}

export type ContaminatedSiteType = 'landfill' | 'industrial' | 'accident' | 'shooting_range' | 'other'
export type ContaminatedSiteStatus =
  | 'remediation_needed'
  | 'monitoring_needed'
  | 'investigation_needed'
  | 'not_yet_assessed'
  | 'no_action_needed'
  | 'no_harm_expected'
  | 'other'

export interface ContaminatedSite {
  id: string
  type: ContaminatedSiteType
  /** Official German wording, shown alongside the English summary */
  typeLabel: string
  status: ContaminatedSiteStatus
  statusLabel: string
  /** Metres from the address; 0 when the address lies on the site */
  distanceM: number
  onSite: boolean
  /** Canton code, or the federal office for federal cadastres */
  authority: string
  lat: number
  lng: number
  /** Outline in [lat, lng], absent for sites registered as points */
  polygon?: [number, number][]
}

export interface ContaminationResult {
  status: RiskStatus
  canton?: string
  cantonName?: string
  sites: ContaminatedSite[]
  radiusM: number
  credits: RiskSourceCredit[]
  message?: string
}

export interface RisksResult {
  hazards: HazardResult
  contamination: ContaminationResult
  /** FOPH radon map; only fetched while RADON_ENABLED is on (lib/flags.ts) */
  radon?: RadonResult
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
  censusData?: DemographicsResult
  nearestEssentials?: NearestEssentials
  cityAqi?: number
  cityAqiName?: string
  aqiSource?: string
  transitCh?: TransitCHResult
  /** Address searches only (not area results); absent on older saved addresses */
  risks?: RisksResult
}

export interface SavedAddress {
  id: string
  user_id: string
  address: string
  lat: number
  lng: number
  metrics: AddressMetrics
  created_at: string
  /** Construction watch (migration 2026-10-12); absent until it's applied */
  watch_enabled?: boolean
  last_notified_at?: string | null
}

export interface Neighborhood {
  name: string
  /** Parent city name for district-level areas (e.g. "Zürich" for "Kreis 1 (Altstadt)") */
  parent?: string
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

export const PROFILE_WEIGHTS: Record<Profile, Record<keyof Omit<Neighborhood, 'name' | 'parent' | 'lat' | 'lng' | 'rent' | 'notes'>, number>> = {
  'Family':            { walkability: 10, air: 10, green: 15, grocery: 10, transit: 5,  safety: 25, education: 25, healthcare: 5,  dining: 0,  quiet: 5  },
  'Young Professional': { walkability: 20, air: 5,  green: 5,  grocery: 10, transit: 25, safety: 10, education: 0,  healthcare: 5,  dining: 20, quiet: 0  },
  'Retiree':           { walkability: 5,  air: 10, green: 20, grocery: 10, transit: 5,  safety: 25, education: 0,  healthcare: 20, dining: 0,  quiet: 5  },
  'Nature Lover':      { walkability: 5,  air: 35, green: 35, grocery: 5,  transit: 5,  safety: 10, education: 0,  healthcare: 0,  dining: 0,  quiet: 5  },
}
