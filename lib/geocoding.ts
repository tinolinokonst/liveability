import { GeoLocation } from './types'

export async function geocodeAddress(address: string): Promise<GeoLocation | null> {
  const res = await fetch(`/api/geocoding?address=${encodeURIComponent(address)}`)
  const data = await res.json()

  if (data.status !== 'OK' || !data.results?.length) return null

  const result = data.results[0]
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  }
}
