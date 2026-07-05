// Generous bounding box around the Columbus, OH metro area
const BOUNDS = { minLat: 39.6, maxLat: 40.4, minLng: -83.5, maxLng: -82.4 }

export function parseCoords(
  latRaw: string | null,
  lngRaw: string | null
): { lat: number; lng: number } | null {
  if (!latRaw || !lngRaw) return null
  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat) return null
  if (lng < BOUNDS.minLng || lng > BOUNDS.maxLng) return null
  return { lat, lng }
}
