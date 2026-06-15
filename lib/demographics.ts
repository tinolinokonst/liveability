import { DemographicsResult } from './types'

const UNAVAILABLE: DemographicsResult = { medianHouseholdIncome: null, totalPopulation: null, available: false, message: 'Demographic data unavailable for this location' }

export async function fetchDemographics(lat: number, lng: number): Promise<DemographicsResult> {
  try {
    const res = await fetch(`/api/demographics?lat=${lat}&lng=${lng}`)
    if (!res.ok) return UNAVAILABLE
    return await res.json()
  } catch {
    return UNAVAILABLE
  }
}
