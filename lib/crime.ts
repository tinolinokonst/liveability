import { CrimeResult } from './types'

export async function fetchCrimeScore(lat: number, lng: number): Promise<CrimeResult> {
  const res = await fetch(`/api/crime?lat=${lat}&lng=${lng}`)

  if (!res.ok) {
    return { incidentCount: 0, topIncidentTypes: [], safetyScore: 60, note: 'data unavailable' }
  }

  return await res.json()
}
