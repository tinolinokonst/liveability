export interface AQIResult {
  aqi: number
  category: string
  score: number
}

export async function fetchAQI(lat: number, lng: number): Promise<AQIResult> {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error('AQI fetch failed')

  const data = await res.json()
  const aqi: number = data.current?.us_aqi ?? 50

  let category = 'Good'
  if (aqi > 200) category = 'Very Unhealthy'
  else if (aqi > 150) category = 'Unhealthy'
  else if (aqi > 100) category = 'Unhealthy for Sensitive Groups'
  else if (aqi > 50) category = 'Moderate'

  const score = Math.max(0, Math.min(100, Math.round(100 - aqi)))

  return { aqi, category, score }
}
