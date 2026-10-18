// The US EPA AQI categories and the 0-100 score the cards render, shared by
// the Swiss index (app/api/airquality) and AirNow readings (lib/usAirSources.ts).

export function categoryFor(aqi: number): string {
  if (aqi > 300) return 'Hazardous'
  if (aqi > 200) return 'Very Unhealthy'
  if (aqi > 150) return 'Unhealthy'
  if (aqi > 100) return 'Unhealthy for Sensitive Groups'
  if (aqi > 50) return 'Moderate'
  return 'Good'
}

// Map an AQI onto the 0-100 score the cards render.
//
// A flat `100 - aqi` looked reasonable but put the two labels on the card in
// direct conflict: an AQI of 43 is officially "Good", yet scored 57, which the
// UI's 70/40 thresholds call "Fair" — so the same card read "Fair" in its badge
// and "Good" in its subtitle. This lines the two scales up at their boundaries,
// so an AQI band and the score band always agree:
//   AQI   0 -> 100 |  AQI  50 (Good/Moderate)      -> 70 (the "Good" cutoff)
//   AQI 100 ->  40 (the "Fair" cutoff)             |  AQI 200 -> 0
export function scoreForAqi(aqi: number): number {
  const raw =
    aqi <= 50 ? 100 - aqi * 0.6
    : aqi <= 100 ? 70 - (aqi - 50) * 0.6
    : 40 - (aqi - 100) * 0.4
  // Floor rather than round: at AQI 101 rounding lifts 39.6 back to 40, which is
  // exactly the "Fair" cutoff, so the first Unhealthy-for-Sensitive reading would
  // still have shown a Fair badge.
  return Math.max(0, Math.min(100, Math.floor(raw)))
}
