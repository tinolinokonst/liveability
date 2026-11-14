// Data centers within 10 miles of a US address, from public.data_centers
// (filled by scripts/import-datacenters.ts). Server-only.
//
// With ENABLE_FRACTRACKER off, only PNNL's records are served — each
// facility's own PNNL entry, never fields a FracTracker record contributed
// to a merged row — so turning the flag off hides FracTracker data at once,
// even before the next import drops it from the table.

import { unstable_cache } from 'next/cache'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fracTrackerEnabled } from './flags'
import { UsLookupError, haversineKm, orError, roundCoord } from './usUpstream'
import {
  DATA_CENTER_RADIUS_MILES,
  EMPTY_COUNTS,
  type DataCenterSourceRecord,
  type DataCenterStatus,
  type NearbyDataCenter,
  type UsDataCentersResult,
} from './dataCenters'

const RADIUS_KM = DATA_CENTER_RADIUS_MILES * 1.609344
// Merged rows sit at the preferred record's position; a source's own point
// can be up to 300 m away, so the box reaches a little further
const BOX_MARGIN_KM = 0.5

let client: SupabaseClient | null = null

// The anon key is enough: the table is public-read under RLS
function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new UsLookupError('Supabase is not configured')
  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Cached once, on the parsed result (unstable_cache below)
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  })
  return client
}

interface DbRow {
  id: string
  name: string | null
  operator: string | null
  status: DataCenterStatus
  lat: number
  lng: number
  source: DataCenterSourceRecord['source']
  source_url: string
  source_date: string
  sources: DataCenterSourceRecord[]
}

async function lookup(lat: number, lng: number, withFracTracker: boolean): Promise<UsDataCentersResult> {
  const dLat = (RADIUS_KM + BOX_MARGIN_KM) / 111.32
  const dLng = (RADIUS_KM + BOX_MARGIN_KM) / (111.32 * Math.cos((lat * Math.PI) / 180))
  const { data, error } = await db()
    .from('data_centers')
    .select('id, name, operator, status, lat, lng, source, source_url, source_date, sources')
    .gte('lat', lat - dLat).lte('lat', lat + dLat)
    .gte('lng', lng - dLng).lte('lng', lng + dLng)
    .limit(2000)
  if (error) throw new UsLookupError(`data_centers: ${error.message}`)

  const facilities: NearbyDataCenter[] = []
  for (const row of (data ?? []) as DbRow[]) {
    const entries = withFracTracker ? row.sources : row.sources.filter(s => s.source === 'pnnl')
    if (!entries.length) continue
    // Flag off: the facility as PNNL records it (always "operating")
    const shown = withFracTracker ? row : entries[0]
    const distanceKm = haversineKm(lat, lng, shown.lat, shown.lng)
    if (distanceKm > RADIUS_KM) continue
    facilities.push({
      id: row.id,
      name: shown.name,
      operator: shown.operator,
      status: withFracTracker ? row.status : 'operating',
      lat: shown.lat,
      lng: shown.lng,
      distanceKm: Math.round(distanceKm * 1000) / 1000,
      sources: [...new Map(entries.map(s => [s.source, { source: s.source, url: s.source_url, date: s.source_date }])).values()],
    })
  }
  facilities.sort((a, b) => a.distanceKm - b.distanceKm)

  const counts = { ...EMPTY_COUNTS }
  for (const f of facilities) counts[f.status] += 1
  return { status: 'ok', radiusMiles: DATA_CENTER_RADIUS_MILES, fracTracker: withFracTracker, facilities, counts }
}

// Keyed on ~11 m rounded coordinates and the flag. A day is plenty: the table
// only changes when the import runs.
const cachedLookup = unstable_cache(lookup, ['us-datacenters-v1'], { revalidate: 24 * 60 * 60 })

export async function getUsDataCenters(lat: number, lng: number): Promise<UsDataCentersResult> {
  const withFracTracker = fracTrackerEnabled()
  return orError(
    () => cachedLookup(roundCoord(lat), roundCoord(lng), withFracTracker),
    { status: 'error', radiusMiles: DATA_CENTER_RADIUS_MILES, fracTracker: withFracTracker, facilities: [], counts: { ...EMPTY_COUNTS } },
    'us-datacenters'
  )
}
