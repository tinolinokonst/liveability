import { NearestEssentials } from './types'

const EMPTY: NearestEssentials = {
  trainStation: null, busStop: null, grocery: null, hospital: null,
  pharmacy: null, school: null, library: null, park: null, bank: null,
  dining: null, worship: null, parking: null,
  searchRadiusKm: 15,
}

export async function fetchNearestEssentials(lat: number, lng: number): Promise<NearestEssentials> {
  try {
    const res = await fetch(`/api/nearest?lat=${lat}&lng=${lng}`)
    if (!res.ok) return EMPTY
    return await res.json()
  } catch {
    return EMPTY
  }
}
