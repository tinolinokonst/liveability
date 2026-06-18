"use client"

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
import { aqiColor, METRIC_INFO, MetricKey } from '@/lib/metricInfo'
import { CrimeIncidentLocation, NearestAmenity, NearestEssentialItem, NearestEssentials } from '@/lib/types'

const MetricInfoMap = dynamic(() => import('./MetricInfoMap'), { ssr: false })

const CRIME_RADIUS_METERS = 1000
const AQI_CONTEXT_RADIUS_METERS = 5000

const AMENITY_NOUN: Partial<Record<MetricKey, string>> = {
  grocery:    'grocery stores',
  transit:    'transit stops',
  green:      'parks',
  healthcare: 'healthcare facilities',
  school:     'schools',
  dining:     'dining options',
  library:    'libraries',
  bank:       'banks/ATMs',
  worship:    'places of worship',
  parking:    'parking options',
}

function nearestFromEssentials(
  metricKey: MetricKey,
  ess: NearestEssentials
): NearestEssentialItem | null {
  switch (metricKey) {
    case 'grocery': return ess.grocery
    case 'transit': {
      const a = ess.trainStation, b = ess.busStop
      if (!a && !b) return null
      if (!a) return b
      if (!b) return a
      return a.distanceKm <= b.distanceKm ? a : b
    }
    case 'healthcare': {
      const a = ess.hospital, b = ess.pharmacy
      if (!a && !b) return null
      if (!a) return b
      if (!b) return a
      return a.distanceKm <= b.distanceKm ? a : b
    }
    case 'school':   return ess.school
    case 'library':  return ess.library
    case 'green':    return ess.park
    case 'bank':     return ess.bank
    case 'dining':   return ess.dining
    case 'worship':  return ess.worship
    case 'parking':  return ess.parking
    default:         return null
  }
}

const AQI_LEGEND = [
  { color: '#22c55e', category: 'Good', label: 'Good' },
  { color: '#eab308', category: 'Moderate', label: 'Moderate' },
  { color: '#f97316', category: 'Unhealthy for Sensitive Groups', label: 'Unhealthy (sensitive)' },
  { color: '#ef4444', category: 'Unhealthy', label: 'Unhealthy' },
  { color: '#a855f7', category: 'Very Unhealthy', label: 'Very unhealthy' },
  { color: '#7f1d1d', category: 'Hazardous', label: 'Hazardous' },
]

interface MetricInfoModalProps {
  metricKey: MetricKey
  value?: string
  score?: number
  radius?: number
  places?: NearestAmenity[]
  center?: { lat: number; lng: number }
  category?: string
  crimeIncidents?: CrimeIncidentLocation[]
  searchRadius?: number
  detail?: React.ReactNode
  comparison?: React.ReactNode
  nearestEssentials?: NearestEssentials
  onClose: () => void
}

export default function MetricInfoModal({ metricKey, value, score, radius, places, center, category, crimeIncidents, searchRadius, detail, comparison, nearestEssentials, onClose }: MetricInfoModalProps) {
  const info = METRIC_INFO[metricKey]

  // Nearest-outside logic: find closest amenity if none found within the search radius
  const isAmenityMetric = !!(info.placesKey || metricKey === 'walkability')
  const placesEmpty = isAmenityMetric && (places ?? []).length === 0
  const nearestEssential = (nearestEssentials && placesEmpty)
    ? nearestFromEssentials(metricKey, nearestEssentials)
    : null
  const showNearestOutside = !!(center && nearestEssential)
  const amenityNoun = AMENITY_NOUN[metricKey] ?? info.label.toLowerCase()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-white font-bold text-lg">{info.label}</h3>
            {value !== undefined && (
              <p className="text-2xl font-bold mt-1" style={{ color: '#f97316' }}>{value}</p>
            )}
            {score !== undefined && (
              <p style={{ color: '#a0a0a0' }} className="text-xs mt-0.5">Score: {score}/100</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="leading-none transition-colors"
            style={{ color: '#a0a0a0' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ color: '#a0a0a0' }} className="text-sm leading-relaxed flex flex-col gap-2">
          {detail ?? info.description}
        </div>

        {comparison}

        {center && metricKey === 'aqi' && (
          <MetricInfoMap
            center={center}
            centerLabel={
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-white text-xs">Nearest air quality reading</span>
                <span className="text-xs" style={{ color: '#a0a0a0' }}>
                  AQI {value ?? '—'} · {category ?? 'Unknown'}
                </span>
              </div>
            }
            centerColor={aqiColor(category ?? '')}
            contextCircle={{
              radiusMeters: AQI_CONTEXT_RADIUS_METERS,
              label: 'Approximate area represented by this reading',
              color: aqiColor(category ?? ''),
            }}
            legend={AQI_LEGEND.map(item => ({ ...item, active: item.category === category }))}
          />
        )}

        {center && metricKey === 'safety' && (
          <>
            <MetricInfoMap
              center={center}
              centerLabel="Your address"
              incidents={crimeIncidents ?? []}
              circleRadiusMeters={!crimeIncidents || crimeIncidents.length === 0 ? CRIME_RADIUS_METERS : undefined}
              circleLabel="Approximate search radius (~1km) — incident locations not available"
              legend={
                crimeIncidents && crimeIncidents.length > 0
                  ? [
                      { color: '#f97316', label: 'Your address' },
                      { color: '#ef4444', label: 'Reported incident' },
                    ]
                  : [
                      { color: '#f97316', label: 'Your address' },
                      { color: '#ef4444', label: 'Search radius (~1km)' },
                    ]
              }
            />
            {(!crimeIncidents || crimeIncidents.length === 0) && (
              <p style={{ color: '#a0a0a0' }} className="text-xs">
                Incident locations not available, showing search radius
              </p>
            )}
          </>
        )}

        {center && isAmenityMetric && (
          <>
            <MetricInfoMap
              center={center}
              centerLabel="Searched address"
              markers={places ?? []}
              searchRadiusMeters={searchRadius}
              nearestOutside={showNearestOutside ? {
                lat: nearestEssential!.lat,
                lng: nearestEssential!.lng,
                name: nearestEssential!.name,
                distanceKm: nearestEssential!.distanceKm,
              } : undefined}
              legend={[
                { color: '#f97316', label: 'Your address' },
                ...(!placesEmpty
                  ? [{ color: '#9ca3af', label: metricKey === 'walkability' ? 'Nearby amenities' : `Nearby ${amenityNoun}` }]
                  : []
                ),
                ...(showNearestOutside
                  ? [{ color: '#ef4444', label: `Nearest ${amenityNoun}` }]
                  : []
                ),
              ]}
            />
            {showNearestOutside && (
              <div
                className="rounded-xl px-3 py-2.5 text-xs leading-relaxed"
                style={{ backgroundColor: '#2a2a2a' }}
              >
                <span style={{ color: '#a0a0a0' }}>
                  No {amenityNoun} found within your search radius. The nearest is{' '}
                  <strong className="text-white">
                    {nearestEssential!.name ?? `a ${amenityNoun.replace(/s$/, '')}`}
                  </strong>
                  {', '}
                  <strong className="text-white">{nearestEssential!.distanceKm}km</strong> away
                  {searchRadius ? ` (your radius: ${searchRadius < 1000 ? searchRadius + 'm' : searchRadius / 1000 + 'km'})` : ''}.
                </span>
              </div>
            )}
          </>
        )}

        <div className="pt-3 flex flex-col gap-1" style={{ borderTop: '1px solid #2a2a2a' }}>
          <p style={{ color: '#a0a0a0' }} className="text-xs">
            Source:{' '}
            <a
              href={info.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: '#f97316' }}
            >
              {info.source}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
