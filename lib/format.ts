// Shared display formatting.

/**
 * Round a distance in km for storage, keeping metre resolution.
 *
 * Distances used to be rounded to one decimal at the point they were produced,
 * which floored anything under 50 m to a literal 0 — a bus stop across the road
 * rendered as "0km", reading as missing data rather than "very close". Three
 * decimals keeps the metre, and formatDistance decides how to show it.
 */
export function roundKm(km: number): number {
  return Math.round(km * 1000) / 1000
}

/**
 * Render a distance for display: metres below 1 km, kilometres above.
 *
 * Sub-10 m readings are reported as "<10m" rather than a spuriously exact "4m" —
 * the underlying coordinates are building centroids, so that precision is not
 * real.
 */
export function formatDistance(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return '—'
  const metres = km * 1000
  if (metres < 10) return '<10m'
  // Round first, then pick the unit, so 999 m reads "1km" rather than "1000m"
  const roundedMetres = Math.round(metres / 10) * 10
  if (roundedMetres < 1000) return `${roundedMetres}m`
  return `${Math.round(km * 10) / 10}km`
}
