// WGS84 ↔ Swiss LV95 (EPSG:2056) using swisstopo's published approximation
// formulas ("Approximate formulas for the transformation between Swiss
// projection coordinates and WGS84"). Accurate to about 1 m — ample for
// point-in-zone lookups and 100 m distance checks, and dependency-free.

export function toLv95(lat: number, lng: number): { e: number; n: number } {
  const p = (lat * 3600 - 169028.66) / 10000
  const l = (lng * 3600 - 26782.5) / 10000
  const e = 2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3
  const n = 1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3
  return { e, n }
}

export function fromLv95(e: number, n: number): { lat: number; lng: number } {
  const y = (e - 2600000) / 1e6
  const x = (n - 1200000) / 1e6
  const lng = 2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y ** 3
  const lat = 16.9023892 + 3.238272 * x - 0.270978 * y * y - 0.002528 * x * x - 0.0447 * y * y * x - 0.014 * x ** 3
  return { lat: (lat * 100) / 36, lng: (lng * 100) / 36 }
}
