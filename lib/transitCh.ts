import { TransitCHResult } from './types'

const UNAVAILABLE: TransitCHResult = {
  available: false,
  score: null,
  stationCount: 0,
  nearest: null,
  stations: [],
  message: 'Swiss public transport data unavailable',
}

export async function fetchTransitCh(lat: number, lng: number): Promise<TransitCHResult> {
  try {
    const res = await fetch(`/api/transit-ch?lat=${lat}&lng=${lng}`)
    if (!res.ok) return UNAVAILABLE
    return await res.json()
  } catch {
    return UNAVAILABLE
  }
}

export function formatDepartureTime(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  return new Date(t).toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  })
}

export function formatStationDistance(distanceM: number): string {
  return distanceM >= 1000 ? `${Math.round(distanceM / 100) / 10}km` : `${distanceM}m`
}
