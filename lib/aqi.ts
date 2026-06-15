// EPA PM2.5-to-AQI breakpoint table: [concLow, concHigh, aqiLow, aqiHigh]
const PM25_BREAKPOINTS: Array<[number, number, number, number]> = [
  [0.0, 12.0, 0, 50],
  [12.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 150.4, 151, 200],
  [150.5, 250.4, 201, 300],
  [250.5, 350.4, 301, 400],
  [350.5, 500.4, 401, 500],
]

export function pm25ToAqi(pm25: number): number {
  const c = Math.max(0, pm25)
  for (const [cLow, cHigh, aqiLow, aqiHigh] of PM25_BREAKPOINTS) {
    if (c <= cHigh) {
      return Math.round(((aqiHigh - aqiLow) / (cHigh - cLow)) * (c - cLow) + aqiLow)
    }
  }
  return 500
}

export function aqiToCategory(aqi: number): string {
  if (aqi <= 50) return 'Good'
  if (aqi <= 100) return 'Moderate'
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups'
  if (aqi <= 200) return 'Unhealthy'
  if (aqi <= 300) return 'Very Unhealthy'
  return 'Hazardous'
}
