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

// ─── United States: environment and risks ───────────────────────────────────
// Every US result says where it came from and how good it is. Nothing is ever
// filled in: a source that can't answer reports a status, never a value.

/** 'error' = upstream failure or quota; retried, never cached */
export type UsStatus = 'ok' | 'no_data' | 'error'

/** One AirNow reading: the closest monitor reporting that pollutant */
export interface UsAirReading {
  pollutant: 'PM2.5' | 'PM10' | 'Ozone' | string
  aqi: number
  category: string
  siteName: string
  /** Null when the monitor isn't in the AQS site list near the address */
  distanceKm: number | null
  lat?: number
  lng?: number
}

/** One pollutant's annual statistic from the nearest AQS monitor */
export interface UsAnnualPollutant {
  pollutant: 'pm25' | 'ozone' | 'no2'
  /** PM2.5 and NO2: annual mean. Ozone: 4th-highest daily max 8-hour average */
  value: number
  unit: 'µg/m³' | 'ppm' | 'ppb'
  /** The NAAQS level the value is compared against */
  standard: number
  siteName: string
  distanceKm: number
  lat: number
  lng: number
}

export interface UsAnnualAir {
  status: UsStatus
  year: number | null
  pollutants: UsAnnualPollutant[]
}

export interface UsAirQualityResult {
  status: UsStatus
  /** Highest current NowCast AQI across pollutants (how the AQI is defined) */
  aqi: number | null
  category: string | null
  score: number | null
  /** Local observation time as AirNow reports it, e.g. "2026-10-18 13:00 EDT" */
  observedAt: string | null
  reportingArea: string | null
  readings: UsAirReading[]
  annual: UsAnnualAir
  message?: string
}

export type HeatRiskLevel = 0 | 1 | 2 | 3 | 4

export interface WeatherAlert {
  event: string
  severity: string
  headline: string | null
  /** ISO time the alert ends (or expires, when no end is given) */
  ends: string | null
  sender: string
}

export interface UsWeatherResult {
  /** Active alerts; 'error' only when the alerts request itself failed */
  alertsStatus: UsStatus
  alerts: WeatherAlert[]
  heatStatus: UsStatus
  /** NWS HeatRisk: the highest level forecast over the next 7 days */
  heatRiskMax: HeatRiskLevel | null
  heatRiskToday: HeatRiskLevel | null
  /** Highest forecast maximum temperature over the same days, °F */
  maxTempF: number | null
  forecastUrl: string
}

export type NoiseBand = 'below_45' | '45_50' | '50_55' | '55_60' | '60_70' | '70_80' | '80_90' | 'above_90'
export type NoiseMode = 'road' | 'rail' | 'aviation'

export interface UsNoiseResult {
  status: UsStatus
  /** All modes combined; 'below_45' = under the map's 45 dBA floor */
  band: NoiseBand | null
  score: number | null
  /** Per mode; null when that layer doesn't cover the state (e.g. rail in Hawaii) or failed */
  modes: Record<NoiseMode, NoiseBand | null>
  message?: string
}

export interface UsSunlightResult {
  status: UsStatus
  /** Long-term average global horizontal irradiance, kWh/m²/day (= peak sun hours) */
  ghi: number | null
  /** Same, on a surface tilted at the latitude (a typical fixed solar panel) */
  latTilt: number | null
  monthlyGhi: number[] | null
  score: number | null
  message?: string
}

/** FEMA flood zone designations, grouped the way FEMA explains them */
export type FloodRisk = 'high' | 'coastal_high' | 'moderate' | 'minimal' | 'undetermined' | 'water'

export interface UsFloodResult {
  /** 'no_data': no digital flood map (NFHL) covers this point */
  status: UsStatus
  zone: string | null
  subtype: string | null
  risk: FloodRisk | null
  /** Special Flood Hazard Area: the 1%-annual-chance floodplain */
  sfha: boolean | null
  /** Base flood elevation in feet, when the map gives one */
  bfeFt: number | null
  firmPanel: string | null
  /** FIRM panel effective date, ISO */
  effectiveDate: string | null
}

export type NriRating =
  | 'Very High' | 'Relatively High' | 'Relatively Moderate' | 'Relatively Low' | 'Very Low'
  | 'No Rating' | 'Not Applicable' | 'Insufficient Data'

export interface NriHazard {
  key: string
  label: string
  rating: NriRating
  /** National percentile, 0-100 */
  score: number
}

export interface NriArea {
  name: string
  rating: NriRating
  score: number | null
  /** Hazards with a real rating, worst first */
  topHazards: NriHazard[]
}

export interface UsNriResult {
  status: UsStatus
  tract: NriArea | null
  county: NriArea | null
  version: string | null
}

/** One area's National Risk Index rating for a single hazard */
export interface NriHazardRating {
  rating: NriRating
  /** National percentile, 0-100; null when FEMA gives no score */
  score: number | null
}

/**
 * Wildfire, from FEMA's National Risk Index. (USDA Forest Service Wildfire
 * Risk to Communities was the first choice, but its service refuses our
 * server with HTTP 403.) 'no_data': FEMA rates neither the tract nor the county.
 */
export interface UsWildfireResult {
  status: UsStatus
  tract: NriHazardRating | null
  county: NriHazardRating | null
}

export type EpaSiteKind = 'superfund_npl' | 'superfund' | 'tri' | 'brownfield'

export interface EpaSite {
  registryId: string
  kind: EpaSiteKind
  /** Official site/facility name; omitted for brownfield properties (see lib/usRiskSources.ts) */
  name: string | null
  /** EPA's status wording, e.g. "CURRENTLY ON THE FINAL NPL" */
  status: string | null
  distanceKm: number
  lat: number
  lng: number
  url: string
}

export interface UsEpaSitesResult {
  status: UsStatus
  radiusMiles: number
  sites: EpaSite[]
  counts: Record<EpaSiteKind, number>
}

export interface UsRisksResult {
  flood: UsFloodResult
  nri: UsNriResult
  wildfire: UsWildfireResult
  epa: UsEpaSitesResult
}

// ─── United States: mobility and daily life ─────────────────────────────────

/** A mapped place near a US address (a stop, a shop, a school) */
export interface UsPlace {
  name: string | null
  kind: string
  distanceKm: number
  lat: number
  lng: number
  /** Official record, when the source has one */
  url?: string
}

/** Places within the radius; when there are none, the nearest beyond it */
export interface UsNearby {
  radiusKm: number
  /** How many are within the radius (places may list only the nearest of them) */
  count: number
  places: UsPlace[]
  /** Only set when places is empty and something was found farther out */
  nearestOutside: UsPlace | null
}

export interface UsWalkabilityResult {
  status: UsStatus
  /** EPA National Walkability Index, 1 (least) to 20 (most walkable) */
  index: number | null
  score: number | null
  /** The four inputs, each ranked 1-20 nationally (higher = more walkable) */
  ranks: { intersectionDensity: number; transitProximity: number; employmentMix: number; employmentHousingMix: number } | null
  blockGroup: string | null
}

export interface TransitFeed {
  id: string
  provider: string
  feedName: string | null
  official: boolean | null
  url: string
}

export interface UsTransitResult {
  /** OpenStreetMap stops */
  status: UsStatus
  stops: UsNearby | null
  /** Rail stations among the stops */
  stationCount: number
  score: number | null
  /** Mobility Database: GTFS feeds whose service area covers the address */
  feedsStatus: UsStatus
  feeds: TransitFeed[]
}

export interface UsSchoolsResult {
  status: UsStatus
  schools: UsNearby | null
  /** NCES school years of the two datasets, e.g. "2024-2025" */
  publicYear: string | null
  privateYear: string | null
}

export interface UsFoodAccessResult {
  /** OpenStreetMap supermarkets and grocery stores */
  groceryStatus: UsStatus
  grocery: UsNearby | null
  /** USDA Food Access Research Atlas, for the census tract */
  usdaStatus: UsStatus
  usda: {
    tract: string
    urban: boolean
    lowIncome: boolean
    /** Low income and low access: 1 mile (urban) / 10 miles (rural) */
    lila1And10: boolean
    /** Low income and low access: ½ mile (urban) / 10 miles (rural) */
    lilaHalfAnd10: boolean
    /** Low access alone (any income): 1 mile (urban) / 10 miles (rural) */
    lowAccess1And10: boolean
    povertyRate: number | null
  } | null
}

export interface BroadbandArea {
  /** Residential units the shares are of */
  units: number
  wired100: number
  wired1000: number
  fiber100: number
  terrestrial100: number
}

export interface UsBroadbandResult {
  status: UsStatus
  county: string | null
  /** Which part of the county the figures describe */
  area: 'urban' | 'rural' | 'total' | null
  figures: BroadbandArea | null
  asOf: string | null
}

export interface HealthMeasure {
  id: string
  label: string
  /** Share of adults, % (model-based estimate) */
  tract: number | null
  county: number | null
  /** true when a higher share is better (e.g. routine checkups) */
  higherIsBetter: boolean
}

export interface UsHealthResult {
  placesStatus: UsStatus
  measures: HealthMeasure[]
  placesYear: string | null
  /** CDC/ATSDR Social Vulnerability Index, percentiles 0-1 */
  sviStatus: UsStatus
  svi: { overall: number; socioeconomic: number | null; household: number | null; minority: number | null; housing: number | null } | null
  tract: string | null
}

// ─── United States: community, safety, rent ─────────────────────────────────

/** Census ACS 5-year estimates for the tract, with county and US for context */
export interface AcsFigures {
  medianHouseholdIncome: number | null
  medianGrossRent: number | null
  medianAge: number | null
  population: number | null
}

export interface UsCommunityResult {
  status: UsStatus
  /** e.g. "2020–2024" */
  acsPeriod: string | null
  tract: AcsFigures | null
  county: AcsFigures | null
  us: AcsFigures | null
  /** People per square mile of land */
  densityPerSqMi: number | null
  tractName: string | null
  countyName: string | null
  /** Opportunity Atlas, on 2010 tract boundaries */
  mobilityStatus: UsStatus
  mobility: {
    /** Adult household income percentile of children raised here by parents at the 25th percentile */
    p25: number
    nationalP25: number
    children: number
    tract2010: string
  } | null
}

export interface CrimeRates {
  /** Offenses per 100,000 people over the year */
  violent: number | null
  property: number | null
}

export interface UsSafetyResult {
  status: UsStatus
  agency: { ori: string; name: string; type: string } | null
  /** How the agency was matched: the address's city, or its county */
  matchedBy: 'city' | 'county' | null
  year: number | null
  rates: CrimeRates | null
  stateRates: CrimeRates | null
  usRates: CrimeRates | null
  stateName: string | null
  score: number | null
  message?: string
}

export interface UsRentResult {
  status: UsStatus
  /** Monthly rent by bedrooms, 0 (studio) to 4 */
  byBedrooms: [number, number, number, number, number] | null
  /** 'zip': Small Area FMR for the ZIP code; 'area': the metro or county FMR */
  level: 'zip' | 'area' | null
  zip: string | null
  areaName: string | null
  fiscalYear: string
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
