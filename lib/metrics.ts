import { fetchAQI, AQIResult } from './airquality'
import { fetchAmenityScores } from './overpass'
import { fetchCrimeScore } from './crime'
import { fetchSunlight } from './sunlight'
import { fetchNoiseEstimate } from './noise'
import { fetchCensus } from './census'
import { fetchNearestEssentials } from './nearest'
import { fetchTransitCh } from './transitCh'
import { AddressMetrics, AmenityScores, CrimeResult, DemographicsResult, GeoLocation, NearestEssentials, NoiseResult, SunlightResult, TransitCHResult } from './types'

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

  const overallScore = Math.round(
    aqiData.score * 0.20 +
    amenityData.walkabilityScore * 0.20 +
    amenityData.groceryScore * 0.10 +
    transitScore * 0.10 +
    amenityData.greenScore * 0.10 +
    amenityData.schoolScore * 0.05 +
    amenityData.healthcareScore * 0.10 +
    amenityData.diningScore * 0.05 +
    crimeData.safetyScore * 0.10
  )

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
