import { GeoLocation } from './types'

export async function geocodeAddress(address: string): Promise<GeoLocation | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured')

  const query = address.toLowerCase().includes('columbus') ? address : `${address}, Columbus, OH`
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`

  const res = await fetch(url)
  const data = await res.json()

  if (data.status !== 'OK' || !data.results?.length) return null

  const result = data.results[0]
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  }
}
