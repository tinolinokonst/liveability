import { AQIResult } from './airquality'
import { riskPenalty } from './risks'
import { providersFor } from './providers'
import { COUNTRIES, countryOf } from './country'
import { AddressMetrics, AmenityScores, CrimeResult, DemographicsResult, GeoLocation, NearestEssentials, NoiseResult, RisksResult, SunlightResult, TransitCHResult } from './types'

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
  id?: string,
  risks?: RisksResult
): AddressMetrics {
  // Prefer the live Swiss public transport score (distance + departure frequency)
  // over the OSM stop-count score when available
  const transitScore = transitCh?.available && transitCh.score !== null
    ? transitCh.score
    : amenityData.transitScore

  const baseScore = compositeScore([
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
  // Risks are penalties only, applied after the weighted mean (see lib/risks.ts):
  // a hazard zone or contaminated site lowers the score, missing data never does
  const overallScore = Math.max(0, baseScore - riskPenalty(risks))

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
    risks,
  }
}

export async function fetchFullMetrics(
  address: string,
  location: GeoLocation,
  radius: number = 800,
  id?: string,
  /** Address-level risks; off for areas, where a single centre point would mislead */
  includeRisks = false,
  /** RADON_ENABLED, from useFeatureFlags */
  includeRadon = false
): Promise<AddressMetrics> {
  // Same country routing as the address search (lib/providers.ts)
  const providers = providersFor(countryOf(location))
  if (!providers) throw new Error(`Scores for addresses in ${COUNTRIES[countryOf(location)].name} are coming soon`)
  const { lat, lng } = location

  const [aqi, amenity, crime, sunlight, noise, census, nearest, transitCh, risks] = await Promise.all([
    providers.airQuality(lat, lng),
    providers.amenities(lat, lng, radius),
    providers.safety(lat, lng),
    providers.sunlight(lat, lng),
    providers.noise(lat, lng),
    providers.community(lat, lng),
    providers.nearestEssentials(lat, lng),
    providers.transit(lat, lng),
    includeRisks ? providers.risks(lat, lng, { radon: includeRadon }) : Promise.resolve(undefined),
  ])

  return buildMetrics(address, location, aqi, amenity, crime, sunlight, noise, census, nearest, transitCh, id, risks)
}
