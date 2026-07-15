import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'
import type { TransitDeparture, TransitStation } from '@/lib/types'

// Swiss public transport data from transport.opendata.ch (free, no API key):
//  - /v1/locations?x={lat}&y={lng}&type=station → nearest stations with distance in meters
//  - /v1/stationboard?id={id}                   → real upcoming departures
// Attribution: "Source: transport.opendata.ch / Swiss public transport".

const BASE = 'https://transport.opendata.ch/v1'
const TIMEOUT_MS = 10000

const STATION_RADIUS_M = 800 // stations within this distance count toward density
const BOARD_STATIONS = 4 // how many nearby stations get a live departure board
const NEAREST_BOARD_LIMIT = 20 // enough departures to measure hourly frequency
const OTHER_BOARD_LIMIT = 6

interface RawStation {
  id?: string | null
  name?: string | null
  distance?: number | null
  icon?: string | null
  coordinate?: { x?: number | null; y?: number | null }
}

interface RawJourney {
  category?: string | null
  number?: string | null
  to?: string | null
  stop?: { departure?: string | null; delay?: number | null }
}

async function fetchJson(url: string): Promise<unknown | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    if (!res.ok) {
      console.log(`[transit-ch] fetch failed (${res.status}): ${url.slice(0, 100)}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.log('[transit-ch] fetch error:', err instanceof Error ? err.message : err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function parseStations(data: unknown): Omit<TransitStation, 'departures'>[] {
  const raw = (data as { stations?: RawStation[] })?.stations
  if (!Array.isArray(raw)) return []

  const stations: Omit<TransitStation, 'departures'>[] = []
  for (const s of raw) {
    // The locations endpoint mixes in plain-address results; real stations have
    // an id, an icon (tram/bus/train/ship) and resolved coordinates.
    if (!s.id || !s.name || typeof s.distance !== 'number') continue
    const lat = s.coordinate?.x
    const lng = s.coordinate?.y
    if (typeof lat !== 'number' || typeof lng !== 'number') continue
    stations.push({
      id: s.id,
      name: s.name,
      distanceM: Math.round(s.distance),
      lat,
      lng,
      icon: s.icon ?? null,
    })
  }
  return stations.sort((a, b) => a.distanceM - b.distanceM)
}

function parseDepartures(data: unknown): TransitDeparture[] {
  const board = (data as { stationboard?: RawJourney[] })?.stationboard
  if (!Array.isArray(board)) return []

  const departures: TransitDeparture[] = []
  for (const j of board) {
    const time = j.stop?.departure
    if (!time || !j.to) continue
    const line = [j.category, j.number].filter(Boolean).join(' ').trim() || '—'
    departures.push({ line, to: j.to, time, delay: j.stop?.delay ?? null })
  }
  return departures
}

// Swiss transit density justifies a generous scale:
//  - Distance (max 60 pts): 100m or closer to a station is a full 60; fades to 0 at 1km.
//  - Frequency (max 40 pts): 12+ departures in the next hour at the nearest station
//    (≈ every 5 minutes) is a full 40.
function computeScore(nearestDistanceM: number | null, departuresNextHour: number): number | null {
  if (nearestDistanceM === null) return null
  const distancePts = 60 * Math.max(0, Math.min(1, (1000 - nearestDistanceM) / 900))
  const frequencyPts = 40 * Math.max(0, Math.min(1, departuresNextHour / 12))
  return Math.round(distancePts + frequencyPts)
}

export async function GET(request: NextRequest) {
  const guard = await guardRequest('transit-ch', 60, 3600)
  if ('response' in guard) return guard.response

  const searchParams = request.nextUrl.searchParams
  const coords = parseCoords(searchParams.get('lat'), searchParams.get('lng'))

  if (!coords) {
    return NextResponse.json({ error: 'Valid Switzerland lat and lng are required' }, { status: 400 })
  }

  // Note: for this API, x is latitude and y is longitude.
  const locationsData = await fetchJson(`${BASE}/locations?x=${coords.lat}&y=${coords.lng}&type=station`)
  if (!locationsData) {
    return NextResponse.json({
      available: false,
      score: null,
      stationCount: 0,
      nearest: null,
      stations: [],
      message: 'Swiss public transport data temporarily unavailable',
    })
  }

  const found = parseStations(locationsData)
  if (found.length === 0) {
    return NextResponse.json({
      available: true,
      score: 5,
      stationCount: 0,
      nearest: null,
      stations: [],
      message: 'No public transport stations found nearby',
    })
  }

  // Live departure boards for the closest stations
  const boardTargets = found.slice(0, BOARD_STATIONS)
  const boards = await Promise.all(
    boardTargets.map((s, i) =>
      fetchJson(`${BASE}/stationboard?id=${encodeURIComponent(s.id)}&limit=${i === 0 ? NEAREST_BOARD_LIMIT : OTHER_BOARD_LIMIT}`)
    )
  )

  const stations: TransitStation[] = boardTargets.map((s, i) => ({
    ...s,
    departures: parseDepartures(boards[i]),
  }))

  // Departure frequency at the nearest station: departures within the next hour
  const now = Date.now()
  const inNextHour = stations[0].departures.filter(d => {
    const t = Date.parse(d.time)
    return Number.isFinite(t) && t >= now - 60_000 && t <= now + 3_600_000
  }).length

  const nearest = stations[0]
  const stationCount = found.filter(s => s.distanceM <= STATION_RADIUS_M).length
  const score = computeScore(nearest.distanceM, inNextHour)

  return NextResponse.json({
    available: true,
    score,
    stationCount,
    radiusM: STATION_RADIUS_M,
    departuresNextHour: inNextHour,
    nearest,
    stations,
    source: 'transport.opendata.ch / Swiss public transport',
  })
}
