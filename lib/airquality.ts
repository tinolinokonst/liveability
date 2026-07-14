export interface AQIResult {
  aqi: number
  category: string
  score: number
  source?: string
}

export async function fetchAQI(lat: number, lng: number): Promise<AQIResult> {
  const res = await fetch(`/api/airquality?lat=${lat}&lng=${lng}`)
  if (!res.ok) throw new Error('AQI fetch failed')

  const data = await res.json()

  // New shape: the route computes index, category, and score server-side
  // (BAFU annual modeling, or Open-Meteo fallback)
  if (typeof data.aqi === 'number' && typeof data.category === 'string' && typeof data.score === 'number') {
    return { aqi: data.aqi, category: data.category, score: data.score, source: data.source }
  }

  // Legacy shape: raw Open-Meteo passthrough
  const aqi: number = data.current?.us_aqi ?? 50

  let category = 'Good'
  if (aqi > 200) category = 'Very Unhealthy'
  else if (aqi > 150) category = 'Unhealthy'
  else if (aqi > 100) category = 'Unhealthy for Sensitive Groups'
  else if (aqi > 50) category = 'Moderate'

  const score = Math.max(0, Math.min(100, Math.round(100 - aqi)))

  return { aqi, category, score }
}
