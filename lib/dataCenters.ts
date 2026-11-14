// Data centers near a US address: the shape shared by the import script
// (scripts/import-datacenters.ts), the server lookup (lib/usDataCenterSource.ts),
// the API route and the card (components/UsDataCentersCard.tsx), plus the
// sources' attribution and the card's required wording. Client-safe.

import type { UsStatus } from './types'

export type DataCenterStatus = 'operating' | 'approved' | 'proposed'
export type DataCenterSourceId = 'pnnl' | 'fractracker'

export const DATA_CENTER_STATUSES: DataCenterStatus[] = ['operating', 'approved', 'proposed']

export const DATA_CENTER_RADIUS_MILES = 10

/** One tracker's record of a facility, as stored in data_centers.sources */
export interface DataCenterSourceRecord {
  source: DataCenterSourceId
  record_id: string
  name: string | null
  operator: string | null
  status: DataCenterStatus
  lat: number
  lng: number
  source_url: string
  source_date: string
}

export interface NearbyDataCenter {
  id: string
  name: string | null
  operator: string | null
  status: DataCenterStatus
  lat: number
  lng: number
  distanceKm: number
  /** Every tracker that lists this facility (two when both do) */
  sources: Array<{ source: DataCenterSourceId; url: string; date: string }>
}

export interface UsDataCentersResult {
  status: UsStatus
  radiusMiles: number
  /** ENABLE_FRACTRACKER: approved and proposed projects are included */
  fracTracker: boolean
  facilities: NearbyDataCenter[]
  counts: Record<DataCenterStatus, number>
}

// PNNL release the import uses (scripts/import-datacenters.ts pins the commit
// of PNNL's atlas repository that publishes it, and checks the two agree)
export const PNNL_ATLAS = {
  version: 'v2026.11.02',
  url: 'https://im3.pnnl.gov/datacenter-atlas',
  licence: 'ODbL 1.0',
  licenceUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
}

export const SOURCE_INFO: Record<DataCenterSourceId, { label: string; short: string; url: string }> = {
  pnnl: {
    label: 'PNNL IM3 Open Source Data Center Atlas',
    short: 'PNNL IM3 Atlas (OpenStreetMap)',
    url: 'https://doi.org/10.57931/17054299',
  },
  fractracker: {
    label: 'FracTracker Alliance, U.S. Data Centers Tracker',
    short: 'FracTracker Alliance',
    url: 'https://fractracker.org/data-centers-tracker/',
  },
}

export const STATUS_INFO: Record<DataCenterStatus, { label: string; plural: string; color: string; meaning: string }> = {
  operating: { label: 'Operating', plural: 'operating', color: '#a855f7', meaning: 'Built and running, including sites that are expanding.' },
  approved: { label: 'Approved', plural: 'approved', color: '#eab308', meaning: 'Approved, permitted or under construction.' },
  proposed: { label: 'Proposed', plural: 'proposed', color: '#a0a0a0', meaning: 'Announced or applied for; not approved.' },
}

// Required wording. The "not guaranteed" sentence only applies when proposed
// projects are shown (FracTracker on).
export const DATA_CENTERS_PROPOSED_NOTE = 'Proposed projects are not guaranteed to be built.'
export const DATA_CENTERS_INCOMPLETE_NOTE =
  "Data comes from public trackers that may be incomplete; check your county's land-use records for the latest applications."

export function dataCentersNote(fracTracker: boolean): string {
  return fracTracker ? `${DATA_CENTERS_PROPOSED_NOTE} ${DATA_CENTERS_INCOMPLETE_NOTE}` : DATA_CENTERS_INCOMPLETE_NOTE
}

export const EMPTY_COUNTS: Record<DataCenterStatus, number> = { operating: 0, approved: 0, proposed: 0 }
