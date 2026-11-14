"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Server } from 'lucide-react'
import MetricInfoModal from './MetricInfoModal'
import { CardShell, NoteBox } from './RiskCards'
import DataCenterAtlasCredit from './DataCenterAtlasCredit'
import type { LegendItem } from './MetricInfoMap'
import { formatDistanceFor } from '@/lib/country'
import { MUTED, UNAVAILABLE } from '@/lib/usMetrics'
import {
  DATA_CENTER_STATUSES,
  dataCentersNote,
  PNNL_ATLAS,
  SOURCE_INFO,
  STATUS_INFO,
  type NearbyDataCenter,
  type UsDataCentersResult,
} from '@/lib/dataCenters'
import type { NearestAmenity } from '@/lib/types'

const MetricInfoMap = dynamic(() => import('./MetricInfoMap'), { ssr: false })

const NEUTRAL = '#6b6b6b'
const mi = (km: number) => formatDistanceFor(km, 'US')

function displayName(f: NearbyDataCenter): string {
  return f.name ?? (f.operator ? `${f.operator} data center` : 'Unnamed data center')
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

/**
 * Data centers within 10 miles (Risks section, US only). Counts and distances
 * only; never a probability of a project being built.
 *
 * ENABLE_FRACTRACKER off: PNNL's existing facilities only, titled "Operating
 * data centers nearby", with no approved/proposed counts and no "not
 * guaranteed" note.
 */
export default function UsDataCentersCard({ d, center }: { d: UsDataCentersResult; center: { lat: number; lng: number } }) {
  const [open, setOpen] = useState(false)
  const ft = d.fracTracker
  const label = ft ? 'Data centers nearby' : 'Operating data centers nearby'
  const note = dataCentersNote(ft)
  const radius = `${d.radiusMiles} miles`

  if (d.status !== 'ok') {
    return <CardShell icon={Server} label={label} value={UNAVAILABLE} valueColor={MUTED} sub="Try again later." footer={note} credit={<DataCenterAtlasCredit />} />
  }

  const n = d.facilities.length
  const nearest = d.facilities[0]
  const statuses = ft ? DATA_CENTER_STATUSES : (['operating'] as const)
  const countLine = statuses.filter(s => d.counts[s] > 0).map(s => `${d.counts[s]} ${STATUS_INFO[s].plural}`).join(' · ')

  const value = n === 0
    ? `No known ${ft ? '' : 'operating '}data centers within ${radius}`
    : `${n} ${ft ? '' : 'operating '}within ${d.radiusMiles} mi`
  const sub = n === 0
    ? `None listed in the ${ft ? 'trackers' : 'tracker'} we use.`
    : `${ft ? `${countLine}. ` : ''}Nearest: ${displayName(nearest)}, ${mi(nearest.distanceKm)} away.`

  const markers: NearestAmenity[] = d.facilities.map(f => ({
    name: displayName(f),
    distanceKm: f.distanceKm,
    lat: f.lat,
    lng: f.lng,
    category: STATUS_INFO[f.status].label,
    markerColor: STATUS_INFO[f.status].color,
    popupLines: f.operator && f.name ? [f.operator] : undefined,
  }))
  const legend: LegendItem[] = [
    { color: '#f97316', label: 'This address' },
    ...statuses.filter(s => d.counts[s] > 0).map(s => ({ color: STATUS_INFO[s].color, label: `${STATUS_INFO[s].label} data center` })),
  ]
  const hasPnnl = d.facilities.some(f => f.sources.some(s => s.source === 'pnnl'))

  return (
    <>
      <CardShell icon={Server} label={label} value={value} valueColor="#ffffff" sub={sub} footer={note} credit={<DataCenterAtlasCredit />} onOpen={() => setOpen(true)} />
      {open && (
        <MetricInfoModal
          metricKey="dataCenters"
          value={value}
          detail={
            <>
              <p>
                <strong className="text-white">
                  {n === 0
                    ? `No known ${ft ? '' : 'operating '}data centers within ${radius} of this address.`
                    : `${n} ${ft ? '' : 'operating '}data center${n === 1 ? '' : 's'} within ${radius}; the nearest is ${mi(nearest.distanceKm)} away.`}
                </strong>
                {ft && n > 0 && <> {countLine}.</>}
              </p>
              {n > 0 && (
                <ul className="flex flex-col gap-2">
                  {d.facilities.map(f => (
                    <li key={f.id} className="rounded-xl px-3 py-2.5 flex flex-col gap-0.5" style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}>
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-white text-sm font-semibold">{displayName(f)}</span>
                        <span className="text-xs shrink-0">{mi(f.distanceKm)}</span>
                      </span>
                      <span className="text-xs">
                        <span className="font-semibold" style={{ color: STATUS_INFO[f.status].color }}>{STATUS_INFO[f.status].label}</span>
                        {f.operator && <> · {f.operator}</>}
                      </span>
                      <span className="text-[11px]" style={{ color: NEUTRAL }}>
                        {f.sources.map((s, i) => (
                          <span key={s.source}>
                            {i > 0 && ' · '}
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{SOURCE_INFO[s.source].short}</a>
                            {`, ${formatDate(s.date)}`}
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {ft && (
                <ul className="flex flex-col gap-1 text-xs">
                  {DATA_CENTER_STATUSES.map(s => (
                    <li key={s}><span style={{ color: STATUS_INFO[s].color }}>{STATUS_INFO[s].label}:</span> {STATUS_INFO[s].meaning}</li>
                  ))}
                </ul>
              )}
              <p className="text-xs">
                {ft
                  ? 'Existing facilities come from OpenStreetMap via PNNL; approved and proposed projects from FracTracker Alliance. A facility listed by both appears once, with both sources.'
                  : 'Existing facilities mapped in OpenStreetMap, compiled by Pacific Northwest National Laboratory. Planned and proposed projects are not included.'}{' '}
                Distances are to each facility&apos;s mapped centre.
              </p>
              <NoteBox text={note} />
              <p className="text-[11px]" style={{ color: NEUTRAL }}>
                <DataCenterAtlasCredit />.{' '}
                Contains information from the IM3 Open Source Data Center Atlas (Mongird et al., Pacific Northwest National
                Laboratory), which is made available under the{' '}
                <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer" className="underline">Open Database License (ODbL)</a>.
                Data center locations derived from{' '}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a>{' '}
                &copy; OpenStreetMap contributors, also under the ODbL. State and county boundaries: US Census Bureau.
                {ft && ' Approved and proposed projects: FracTracker Alliance, U.S. Data Centers Tracker.'}
              </p>
            </>
          }
          map={
            <MetricInfoMap
              basemap="us"
              center={center}
              centerLabel="This address"
              markers={markers}
              markersFromOsm={hasPnnl}
              searchRadiusMeters={d.radiusMiles * 1609.344}
              legend={legend}
            />
          }
          sources={[
            { label: `${SOURCE_INFO.pnnl.label} (${PNNL_ATLAS.version}, ${PNNL_ATLAS.licence})`, url: PNNL_ATLAS.url },
            { label: `Dataset record and DOI`, url: SOURCE_INFO.pnnl.url },
            { label: `${PNNL_ATLAS.licence} licence`, url: PNNL_ATLAS.licenceUrl },
            { label: '© OpenStreetMap contributors (ODbL)', url: 'https://www.openstreetmap.org/copyright' },
            ...(ft ? [{ label: SOURCE_INFO.fractracker.label, url: SOURCE_INFO.fractracker.url }] : []),
          ]}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
