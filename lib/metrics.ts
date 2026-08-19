import { fetchAQI, AQIResult } from './airquality'
import { fetchAmenityScores } from './overpass'
import { fetchCrimeScore } from './crime'
import { fetchSunlight } from './sunlight'
import { fetchNoiseEstimate } from './noise'
import { fetchCensus } from './census'
import { fetchNearestEssentials } from './nearest'
import { fetchTransitCh } from './transitCh'
import { AddressMetrics, AmenityScores, CrimeResult, DemographicsResult, GeoLocation, NearestEssentials, NoiseResult, SunlightResult, TransitCHResult } from './types'

// Single source of truth for an address's headline score.
//
// This used to be computed twice: a nine-metric version here (which is what got
// persisted to saved_addresses) and an eleven-metric version in AddressResults
// (which is what the user actually saw). They disagreed — a Zürich address read
// 88 in one place and 82 in the other, and the number you saved was not the
// number on screen. The eleven-metric weighting won, because leaving sunlight
// and noise out of the score while still showing them as metrics was the bug.
const WEIGHTS = {
  aqi: 0.18,
  walkability: 0.18,
  grocery: 0.08,
  transit: 0.08,
  green: 0.08,
  school: 0.05,
  healthcare: 0.08,
  dining: 0.04,
  safety: 0.10,
  sunlight: 0.05,
  noise: 0.04,
} as const

/**
 * Weighted mean over whichever metrics resolved, renormalised so a missing
 * source (sunlight outside Solar API coverage, say) redistributes its weight
 * rather than dragging the score toward zero.
 */
export function compositeScore(parts: Array<[number | null | undefined, number]>): number {
  const available = parts.filter((p): p is [number, number] => p[0] != null)
  if (available.length === 0) return 0
  const totalWeight = available.reduce((sum, [, w]) => sum + w, 0)
  return Math.round(available.reduce((sum, [v, w]) => sum + v * w, 0) / totalWeight)
}

export function buildMetrics(
  address: string,
  location: GeoLocation,
  aqiData: AQIResult,
  amenityData: AmenityScores,
  crimeData: CrimeResult,
  sunlightData: SunlightResult,
  noiseData: NoiseResult,
  censusData: DemographicsResult,
  nearestEssentials: NearestEssentials,
  transitCh?: TransitCHResult,
  id?: string
): AddressMetrics {
  // Prefer the live Swiss public transport score (distance + departure frequency)
  // over the OSM stop-count score when available
  const transitScore = transitCh?.available && transitCh.score !== null
    ? transitCh.score
    : amenityData.transitScore

  const overallScore = compositeScore([
    [aqiData.score, WEIGHTS.aqi],
    [amenityData.walkabilityScore, WEIGHTS.walkability],
    [amenityData.groceryScore, WEIGHTS.grocery],
    [transitScore, WEIGHTS.transit],
    [amenityData.greenScore, WEIGHTS.green],
    [amenityData.schoolScore, WEIGHTS.school],
    [amenityData.healthcareScore, WEIGHTS.healthcare],
    [amenityData.diningScore, WEIGHTS.dining],
    [crimeData.safetyScore, WEIGHTS.safety],
    [sunlightData.available ? sunlightData.score : null, WEIGHTS.sunlight],
    [noiseData.available ? noiseData.score : null, WEIGHTS.noise],
  ])

  return {
    id: id ?? crypto.randomUUID(),
    address,
    location,
    aqi: aqiData.aqi,
    aqiCategory: aqiData.category,
    aqiScore: aqiData.score,
    aqiSource: aqiData.source,
    walkabilityScore: amenityData.walkabilityScore,
    groceryScore: amenityData.groceryScore,
    transitScore,
    greenScore: amenityData.greenScore,
    groceryCount: amenityData.groceryCount,
    transitCount: amenityData.transitCount,
    parkCount: amenityData.parkCount,
    schoolCount: amenityData.schoolCount,
    schoolScore: amenityData.schoolScore,
    healthcareCount: amenityData.healthcareCount,
    healthcareScore: amenityData.healthcareScore,
    diningCount: amenityData.diningCount,
    diningScore: amenityData.diningScore,
    gymCount: amenityData.gymCount,
    gymScore: amenityData.gymScore,
    libraryCount: amenityData.libraryCount,
    libraryScore: amenityData.libraryScore,
    bankCount: amenityData.bankCount,
    bankScore: amenityData.bankScore,
    worshipCount: amenityData.worshipCount,
    worshipScore: amenityData.worshipScore,
    parkingCount: amenityData.parkingCount,
    parkingScore: amenityData.parkingScore,
    crimeIncidentCount: crimeData.incidentCount,
    crimeTopTypes: crimeData.topIncidentTypes,
    safetyScore: crimeData.safetyScore,
    safetyNote: crimeData.note,
    overallScore,
    radius: amenityData.radius,
    nearestGrocery: amenityData.nearestGrocery,
    nearestPark: amenityData.nearestPark,
    nearestSchool: amenityData.nearestSchool,
    nearestHealthcare: amenityData.nearestHealthcare,
    nearestDining: amenityData.nearestDining,
    nearestLibrary: amenityData.nearestLibrary,
    nearestBank: amenityData.nearestBank,
    nearestWorship: amenityData.nearestWorship,
    nearestParking: amenityData.nearestParking,
    places: amenityData.places,
    fetchedAt: new Date().toISOString(),
    crimeIncidents: crimeData.incidents,
    stateCrimeContext: crimeData.stateContext,
    sunlight: sunlightData,
    noise: noiseData,
    censusData,
    nearestEssentials,
    transitCh,
  }
}

export async function fetchFullMetrics(
  address: string,
  location: GeoLocation,
  radius: number = 800,
  id?: string
): Promise<AddressMetrics> {
  const [aqi, amenity, crime, sunlight, noise, census, nearest, transitCh] = await Promise.all([
    fetchAQI(location.lat, location.lng),
    fetchAmenityScores(location.lat, location.lng, radius),
    fetchCrimeScore(location.lat, location.lng),
    fetchSunlight(location.lat, location.lng),
    fetchNoiseEstimate(location.lat, location.lng),
    fetchCensus(location.lat, location.lng),
    fetchNearestEssentials(location.lat, location.lng),
    fetchTransitCh(location.lat, location.lng),
  ])

  return buildMetrics(address, location, aqi, amenity, crime, sunlight, noise, census, nearest, transitCh, id)
}
