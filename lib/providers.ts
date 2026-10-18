// Country routing for address metrics.
//
// Every metric sits behind one shared interface, with a provider per country.
// The Swiss providers are exactly the functions the app has always called, so
// routing through here changes nothing for Swiss addresses. US providers are
// added one metric at a time in later sessions; until a country has all of
// them, its addresses resolve (with Census FIPS codes for the US) but aren't
// scored — partial scores would be misleading.
//
// US environment and risk metrics (air, weather, noise, sunlight, risks) are
// available now and shown per card, unscored overall. Their results keep the
// sources' own units and statuses (lib/types.ts, "United States"), so they
// sit behind their own interface below rather than the Swiss-shaped one; the
// adapters into MetricProviders come with the US composite score.

import { fetchAQI, AQIResult } from './airquality'
import { fetchAmenityScores } from './overpass'
import { fetchCrimeScore } from './crime'
import { fetchSunlight } from './sunlight'
import { fetchNoiseEstimate } from './noise'
import { fetchCensus } from './census'
import { fetchNearestEssentials } from './nearest'
import { fetchTransitCh } from './transitCh'
import { fetchRisks } from './risks'
import { nearestArea } from './neighborhoods'
import { fetchUsAirQuality, fetchUsNoise, fetchUsRisks, fetchUsSunlight, fetchUsWeather } from './usMetrics'
import type { CountryCode } from './country'
import type {
  AmenityScores,
  CrimeResult,
  DemographicsResult,
  NearestEssentials,
  NoiseResult,
  RisksResult,
  SunlightResult,
  TransitCHResult,
  UsAirQualityResult,
  UsNoiseResult,
  UsRisksResult,
  UsSunlightResult,
  UsWeatherResult,
} from './types'

export interface MetricProviders {
  airQuality(lat: number, lng: number): Promise<AQIResult>
  /** The same air-quality reading for a reference city centre, for context */
  referenceAirQuality(lat: number, lng: number): Promise<{ aqi: number; name: string } | null>
  amenities(lat: number, lng: number, radiusM: number): Promise<AmenityScores>
  safety(lat: number, lng: number): Promise<CrimeResult>
  sunlight(lat: number, lng: number): Promise<SunlightResult>
  noise(lat: number, lng: number): Promise<NoiseResult>
  community(lat: number, lng: number): Promise<DemographicsResult>
  nearestEssentials(lat: number, lng: number): Promise<NearestEssentials>
  transit(lat: number, lng: number): Promise<TransitCHResult>
  risks(lat: number, lng: number, opts: { radon?: boolean }): Promise<RisksResult>
}

const SWITZERLAND: MetricProviders = {
  airQuality: fetchAQI,
  referenceAirQuality: async (lat, lng) => {
    // The nearest major Swiss city centre
    const city = nearestArea(lat, lng)
    const result = await fetchAQI(city.lat, city.lng).catch(() => null)
    return result ? { aqi: result.aqi, name: city.name } : null
  },
  amenities: fetchAmenityScores,
  safety: fetchCrimeScore,
  sunlight: fetchSunlight,
  noise: fetchNoiseEstimate,
  community: fetchCensus,
  nearestEssentials: fetchNearestEssentials,
  transit: fetchTransitCh,
  risks: fetchRisks,
}

// Filled in metric by metric (FBI, ACS, …) in later sessions
const UNITED_STATES: Partial<MetricProviders> = {}

export interface UsEnvironmentProviders {
  airQuality(lat: number, lng: number): Promise<UsAirQualityResult>
  weather(lat: number, lng: number): Promise<UsWeatherResult>
  noise(lat: number, lng: number): Promise<UsNoiseResult>
  sunlight(lat: number, lng: number): Promise<UsSunlightResult>
  risks(lat: number, lng: number): Promise<UsRisksResult>
}

const UNITED_STATES_ENVIRONMENT: UsEnvironmentProviders = {
  airQuality: fetchUsAirQuality, // AirNow + EPA AQS
  weather: fetchUsWeather, // NWS alerts + HeatRisk
  noise: fetchUsNoise, // BTS National Transportation Noise Map
  sunlight: fetchUsSunlight, // NLR solar resource
  risks: fetchUsRisks, // FEMA NFHL + NRI, USFS Wildfire Risk to Communities, EPA FRS
}

/** The per-card US environment and risk metrics; null for other countries */
export function environmentProvidersFor(country: CountryCode): UsEnvironmentProviders | null {
  return country === 'US' ? UNITED_STATES_ENVIRONMENT : null
}

const PROVIDERS: Record<CountryCode, Partial<MetricProviders>> = {
  CH: SWITZERLAND,
  US: UNITED_STATES,
}

const REQUIRED: Array<keyof MetricProviders> = [
  'airQuality', 'referenceAirQuality', 'amenities', 'safety', 'sunlight',
  'noise', 'community', 'nearestEssentials', 'transit', 'risks',
]

/** The complete provider set for a country, or null while any metric is missing */
export function providersFor(country: CountryCode): MetricProviders | null {
  const set = PROVIDERS[country]
  return REQUIRED.every(k => typeof set[k] === 'function') ? (set as MetricProviders) : null
}

/** Metrics that already have a provider for this country (for "coming soon" messaging) */
export function availableMetrics(country: CountryCode): Array<keyof MetricProviders | keyof UsEnvironmentProviders> {
  const env = environmentProvidersFor(country)
  const scored = REQUIRED.filter(k => typeof PROVIDERS[country][k] === 'function')
  return [...new Set([...scored, ...(env ? (Object.keys(env) as Array<keyof UsEnvironmentProviders>) : [])])]
}
