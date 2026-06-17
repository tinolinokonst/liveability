import { FBICrimeResult } from './types'

const UNAVAILABLE: FBICrimeResult = {
  agencyName: null,
  violentCrimeRate: null,
  propertyCrimeRate: null,
  year: null,
  available: false,
}

export async function fetchFBICrime(): Promise<FBICrimeResult> {
  try {
    const res = await fetch('/api/fbi-crime')
    if (!res.ok) return UNAVAILABLE
    return await res.json()
  } catch {
    return UNAVAILABLE
  }
}
