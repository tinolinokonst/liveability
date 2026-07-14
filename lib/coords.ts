// Generous bounding box around Switzerland
const BOUNDS = { minLat: 45.7, maxLat: 47.9, minLng: 5.8, maxLng: 10.6 }

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
