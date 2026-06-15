import { SunlightResult } from './types'

const UNAVAILABLE: SunlightResult = { score: null, hoursPerYear: null, available: false, message: 'Solar data not available for this building' }

export async function fetchSunlight(lat: number, lng: number): Promise<SunlightResult> {
  try {
    const res = await fetch(`/api/sunlight?lat=${lat}&lng=${lng}`)
    if (!res.ok) return UNAVAILABLE
    return await res.json()
  } catch {
    return UNAVAILABLE
  }
}
