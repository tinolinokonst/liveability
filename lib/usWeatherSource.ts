// US weather alerts and heat context from the National Weather Service API
// (api.weather.gov: no key, but an identifying User-Agent is required).
//
// - Active alerts for the exact point, cached 5 minutes: alerts are issued
//   and cancelled within the hour, so anything longer would show stale ones.
// - NWS HeatRisk (0-4) and forecast highs from the point's forecast grid
//   cell, cached 1 hour (the grid updates a few times a day).
// - The point → grid cell mapping never changes, so it's cached 30 days.

import { unstable_cache } from 'next/cache'
import { fetchJson, orError, roundCoord, UsLookupError } from './usUpstream'
import type { HeatRiskLevel, UsWeatherResult, WeatherAlert } from './types'

const API = 'https://api.weather.gov'
const GEOJSON = { Accept: 'application/geo+json' }

interface AlertFeature {
  properties: { event: string; severity: string; headline: string | null; ends: string | null; expires: string | null; senderName: string; status: string; messageType: string }
}

async function lookupAlerts(lat: number, lng: number): Promise<WeatherAlert[]> {
  const data = await fetchJson<{ features?: AlertFeature[] }>(`${API}/alerts/active?point=${lat},${lng}`, { headers: GEOJSON })
  if (!Array.isArray(data.features)) throw new UsLookupError('NWS alerts: unexpected response')
  return data.features
    // Exercises and tests are published on the same feed
    .filter(f => f.properties.status === 'Actual' && f.properties.messageType !== 'Cancel')
    .map(f => ({
      event: f.properties.event,
      severity: f.properties.severity,
      headline: f.properties.headline,
      ends: f.properties.ends ?? f.properties.expires,
      sender: f.properties.senderName,
    }))
}

const cachedAlerts = unstable_cache(lookupAlerts, ['us-nws-alerts-v1'], { revalidate: 5 * 60 })

async function lookupGridUrl(lat: number, lng: number): Promise<string> {
  const data = await fetchJson<{ properties?: { forecastGridData?: string } }>(`${API}/points/${lat},${lng}`, { headers: GEOJSON })
  const url = data.properties?.forecastGridData
  if (!url?.startsWith(`${API}/gridpoints/`)) throw new UsLookupError('NWS points: no forecast grid')
  return url
}

const cachedGridUrl = unstable_cache(lookupGridUrl, ['us-nws-grid-v1'], { revalidate: 30 * 24 * 60 * 60 })

interface GridSeries { uom?: string; values: Array<{ validTime: string; value: number | null }> }

interface HeatContext { max: HeatRiskLevel | null; today: HeatRiskLevel | null; maxTempF: number | null }

/** "2026-10-18T11:00:00+00:00/P4DT19H" → [start, end) in ms */
function interval(validTime: string): [number, number] {
  const [start, duration] = validTime.split('/')
  const t = Date.parse(start)
  const m = /P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/.exec(duration ?? '')
  const ms = m ? ((+(m[1] ?? 0) * 24 + +(m[2] ?? 0)) * 60 + +(m[3] ?? 0)) * 60000 : 0
  return [t, t + ms]
}

async function lookupHeat(gridUrl: string): Promise<HeatContext> {
  const data = await fetchJson<{ properties?: { heatRisk?: GridSeries; maxTemperature?: GridSeries } }>(gridUrl, { headers: GEOJSON, timeoutMs: 15000 })
  const p = data.properties
  if (!p) throw new UsLookupError('NWS grid: unexpected response')

  const now = Date.now()
  const horizon = now + 7 * 24 * 3600 * 1000
  let max: number | null = null
  let today: number | null = null
  for (const v of p.heatRisk?.values ?? []) {
    if (typeof v.value !== 'number') continue
    const [start, end] = interval(v.validTime)
    if (end <= now || start >= horizon) continue
    max = Math.max(max ?? 0, v.value)
    if (start <= now && now < end) today = v.value
  }

  let maxC: number | null = null
  for (const v of p.maxTemperature?.values ?? []) {
    if (typeof v.value !== 'number') continue
    const [start, end] = interval(v.validTime)
    if (end <= now || start >= horizon) continue
    maxC = Math.max(maxC ?? -Infinity, v.value)
  }
  const isF = p.maxTemperature?.uom?.includes('degF')
  const level = (n: number | null) => (n === null ? null : (Math.max(0, Math.min(4, Math.round(n))) as HeatRiskLevel))
  return {
    max: level(max),
    today: level(today),
    maxTempF: maxC === null ? null : Math.round(isF ? maxC : maxC * 9 / 5 + 32),
  }
}

const cachedHeat = unstable_cache(lookupHeat, ['us-nws-heat-v1'], { revalidate: 60 * 60 })

export async function getUsWeather(lat: number, lng: number): Promise<UsWeatherResult> {
  // NWS rejects more than 4 decimals on /points and /alerts
  const rLat = roundCoord(lat)
  const rLng = roundCoord(lng)
  const [alerts, heat] = await Promise.all([
    orError(() => cachedAlerts(rLat, rLng), null, 'us-nws-alerts'),
    orError(async () => cachedHeat(await cachedGridUrl(rLat, rLng)), null, 'us-nws-heat'),
  ])
  return {
    alertsStatus: alerts ? 'ok' : 'error',
    alerts: alerts ?? [],
    heatStatus: !heat ? 'error' : heat.max === null ? 'no_data' : 'ok',
    heatRiskMax: heat?.max ?? null,
    heatRiskToday: heat?.today ?? null,
    maxTempF: heat?.maxTempF ?? null,
    forecastUrl: `https://forecast.weather.gov/MapClick.php?lat=${rLat}&lon=${rLng}`,
  }
}
