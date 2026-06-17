import { DemographicsResult } from './types'

const UNAVAILABLE: DemographicsResult = {
  medianHouseholdIncome: null,
  totalPopulation: null,
  medianAge: null,
  available: false,
  message: 'Demographic data unavailable for this location',
}

export async function fetchCensus(lat: number, lng: number): Promise<DemographicsResult> {
  try {
    const res = await fetch(`/api/census?lat=${lat}&lng=${lng}`)
    if (!res.ok) return UNAVAILABLE
    return await res.json()
  } catch {
    return UNAVAILABLE
  }
}
