"use client"

import { useEffect } from 'react'
import { METRIC_INFO, MetricKey } from '@/lib/metricInfo'
import { NearestAmenity } from '@/lib/types'

interface MetricInfoModalProps {
  metricKey: MetricKey
  value?: string
  score?: number
  fetchedAt?: string
  radius?: number
  places?: NearestAmenity[]
  onClose: () => void
}

export default function MetricInfoModal({ metricKey, value, score, fetchedAt, radius, places, onClose }: MetricInfoModalProps) {
  const info = METRIC_INFO[metricKey]

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const fetchedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : undefined

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
            className="text-lg leading-none transition-colors"
            style={{ color: '#a0a0a0' }}
          >
            ✕
          </button>
        </div>

        <p style={{ color: '#a0a0a0' }} className="text-sm leading-relaxed">
          {info.description}
          {radius !== undefined && info.placesKey && ` Radius used: ${radius}m.`}
        </p>

        {places && places.length > 0 && (
          <div className="flex flex-col gap-2">
            <p style={{ color: '#a0a0a0' }} className="text-xs font-medium uppercase tracking-wider">
              Nearby places found
            </p>
            <ul className="flex flex-col gap-1.5">
              {places.map((place, i) => (
                <li key={i} className="flex items-center justify-between text-sm gap-3">
                  <span className="text-white truncate">{place.name}</span>
                  <span style={{ color: '#a0a0a0' }} className="shrink-0">{place.distanceKm}km</span>
                </li>
              ))}
            </ul>
          </div>
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
          {fetchedLabel && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">Data fetched: {fetchedLabel}</p>
          )}
        </div>
      </div>
    </div>
  )
}
