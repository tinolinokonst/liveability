import { GeoLocation, UsGeography } from './types'
import { isCountryCode } from './country'

export async function geocodeAddress(address: string): Promise<GeoLocation | null> {
  const res = await fetch(`/api/geocoding?address=${encodeURIComponent(address)}`)
  const data = await res.json()

  if (data.status !== 'OK' || !data.results?.length) return null

  const result = data.results[0]
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
    // The route only ever answers CH or US; anything else would be a bug, so default to the Swiss path
    country: isCountryCode(result.country) ? result.country : 'CH',
    ...(result.country === 'US' && { us: (result.us ?? null) as UsGeography | null }),
  }
}
