import { NoiseResult } from './types'

const UNAVAILABLE: NoiseResult = { score: null, level: null, nearestRoad: null, available: false, message: 'Noise data unavailable' }

export async function fetchNoiseEstimate(lat: number, lng: number): Promise<NoiseResult> {
  try {
    const res = await fetch(`/api/noise?lat=${lat}&lng=${lng}`)
    if (!res.ok) return UNAVAILABLE
    return await res.json()
  } catch {
    return UNAVAILABLE
  }
}
