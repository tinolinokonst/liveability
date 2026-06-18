"use client"

import { useState } from 'react'
import { Star, X } from 'lucide-react'
import { AddressMetrics, NearestAmenity } from '@/lib/types'
import { MetricKey } from '@/lib/metricInfo'
import MetricInfoModal from './MetricInfoModal'
import { buildDetail, buildComparison } from './AddressResults'

const ACCENT_COLORS = ['#f97316', '#3b82f6', '#a855f7']

const METRICS: Array<{
  key: keyof Pick<AddressMetrics,
    'aqiScore' | 'walkabilityScore' | 'groceryScore' | 'transitScore' | 'greenScore' |
    'safetyScore' | 'healthcareScore' | 'schoolScore' | 'diningScore' | 'overallScore'>
  label: string
  higherIsBetter: boolean
  metricKey?: MetricKey
}> = [
  { key: 'overallScore',     label: 'Overall Score',    higherIsBetter: true },
  { key: 'aqiScore',         label: 'Air Quality',       higherIsBetter: true, metricKey: 'aqi' },
  { key: 'walkabilityScore', label: 'Walkability',       higherIsBetter: true, metricKey: 'walkability' },
  { key: 'groceryScore',     label: 'Grocery Access',    higherIsBetter: true, metricKey: 'grocery' },
  { key: 'transitScore',     label: 'Transit Access',    higherIsBetter: true, metricKey: 'transit' },
  { key: 'greenScore',       label: 'Green Space',       higherIsBetter: true, metricKey: 'green' },
  { key: 'safetyScore',      label: 'Safety / Crime',    higherIsBetter: true, metricKey: 'safety' },
  { key: 'healthcareScore',  label: 'Healthcare Access', higherIsBetter: true, metricKey: 'healthcare' },
  { key: 'schoolScore',      label: 'Schools Nearby',    higherIsBetter: true, metricKey: 'school' },
  { key: 'diningScore',      label: 'Dining & Cafes',    higherIsBetter: true, metricKey: 'dining' },
]

interface AddressCompareProps {
  addresses: AddressMetrics[]
  onRemove: (id: string) => void
}

interface OpenModal {
  metricKey: MetricKey
  addr: AddressMetrics
}

function qualityColor(score: number) {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function getPlacesForMetric(metricKey: MetricKey, addr: AddressMetrics): NearestAmenity[] {
  const p = addr.places
  const E: NearestAmenity[] = []
  if (!p) return E
  switch (metricKey) {
    case 'grocery':    return p.grocery    ?? E
    case 'transit':    return p.transit    ?? E
    case 'green':      return p.park       ?? E
    case 'healthcare': return p.healthcare ?? E
    case 'school':     return p.school     ?? E
    case 'dining':     return p.dining     ?? E
    case 'library':    return p.library    ?? E
    case 'bank':       return p.bank       ?? E
    case 'worship':    return p.worship    ?? E
    case 'parking':    return p.parking    ?? E
    case 'walkability':
      return [
        ...(p.grocery   ?? E),
        ...(p.transit   ?? E),
        ...(p.park      ?? E),
      ].sort((a, b) => a.distanceKm - b.distanceKm)
    default: return E
  }
}

export default function AddressCompare({ addresses, onRemove }: AddressCompareProps) {
  const [openModal, setOpenModal] = useState<OpenModal | null>(null)

  if (addresses.length < 2) {
    return (
      <div className="text-center py-10" style={{ color: '#a0a0a0' }}>
        <p className="text-sm">Search and add at least 2 addresses to compare</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Address headers */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${addresses.length}, 1fr)` }}>
        {addresses.map((addr, i) => (
          <div
            key={addr.id}
            className="rounded-xl p-4"
            style={{ backgroundColor: '#1a1a1a', borderLeft: `3px solid ${ACCENT_COLORS[i]}` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold mb-1" style={{ color: ACCENT_COLORS[i] }}>
                  Address {String.fromCharCode(65 + i)}
                </p>
                <p className="text-white text-xs leading-snug truncate">{addr.location.formattedAddress}</p>
              </div>
              <button
                onClick={() => onRemove(addr.id)}
                style={{ color: '#a0a0a0' }}
                className="hover:text-white transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs -mt-3" style={{ color: '#a0a0a0' }}>
        Click any score cell to open the full metric detail and map for that address.
      </p>

      {/* Comparison table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2a2a' }}>
        {METRICS.map((metric, mi) => {
          const values = addresses.map(a => a[metric.key] as number)
          const best = metric.higherIsBetter ? Math.max(...values) : Math.min(...values)
          const clickable = !!metric.metricKey

          return (
            <div
              key={metric.key}
              className="flex items-center"
              style={{
                borderBottom: mi < METRICS.length - 1 ? '1px solid #2a2a2a' : undefined,
                backgroundColor: mi % 2 === 0 ? '#1a1a1a' : '#141414',
              }}
            >
              {/* Metric label */}
              <div className="py-3 px-4 w-36 shrink-0">
                <span className="text-xs font-medium" style={{ color: '#a0a0a0' }}>
                  {metric.label}
                </span>
              </div>

              {/* Per-address cells */}
              <div className="flex flex-1" style={{ borderLeft: '1px solid #2a2a2a' }}>
                {addresses.map((addr, i) => {
                  const val = addr[metric.key] as number
                  const isWinner = val === best
                  const color = qualityColor(val)

                  return (
                    <div
                      key={addr.id}
                      onClick={clickable ? () => setOpenModal({ metricKey: metric.metricKey!, addr }) : undefined}
                      className={`flex-1 py-3 px-4 flex items-center gap-2 transition-colors ${clickable ? 'cursor-pointer hover:bg-[rgba(249,115,22,0.06)]' : ''}`}
                      style={{ borderRight: i < addresses.length - 1 ? '1px solid #2a2a2a' : undefined }}
                      role={clickable ? 'button' : undefined}
                      title={clickable ? `View ${metric.label} details for Address ${String.fromCharCode(65 + i)}` : undefined}
                    >
                      <span className="text-sm font-bold" style={{ color: isWinner ? '#f97316' : 'white' }}>
                        {val}
                      </span>
                      <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: '#2a2a2a' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${val}%`, backgroundColor: color }}
                        />
                      </div>
                      {isWinner && <Star size={12} fill="#f97316" style={{ color: '#f97316' }} />}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary cards */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${addresses.length}, 1fr)` }}>
        {addresses.map((addr, i) => {
          const wins = METRICS.filter(m => {
            const values = addresses.map(a => a[m.key] as number)
            const best = m.higherIsBetter ? Math.max(...values) : Math.min(...values)
            return (addr[m.key] as number) === best
          }).length

          return (
            <div
              key={addr.id}
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: '#1a1a1a', border: `1px solid ${ACCENT_COLORS[i]}33` }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: ACCENT_COLORS[i] }}>
                Address {String.fromCharCode(65 + i)}
              </p>
              <p className="text-3xl font-bold text-white mb-1">{addr.overallScore}</p>
              <p style={{ color: '#a0a0a0' }} className="text-xs">overall score</p>
              <p className="text-xs mt-2 font-medium" style={{ color: '#f97316' }}>
                {wins} metric{wins !== 1 ? 's' : ''} won
              </p>
            </div>
          )
        })}
      </div>

      {openModal && (
        <MetricInfoModal
          metricKey={openModal.metricKey}
          score={openModal.addr[
            (openModal.metricKey + 'Score') as keyof AddressMetrics
          ] as number | undefined}
          places={getPlacesForMetric(openModal.metricKey, openModal.addr)}
          center={{ lat: openModal.addr.location.lat, lng: openModal.addr.location.lng }}
          category={openModal.addr.aqiCategory}
          crimeIncidents={openModal.addr.crimeIncidents}
          searchRadius={openModal.addr.radius ?? 800}
          detail={buildDetail(openModal.metricKey, openModal.addr)}
          comparison={buildComparison(openModal.metricKey, openModal.addr)}
          nearestEssentials={openModal.addr.nearestEssentials}
          onClose={() => setOpenModal(null)}
        />
      )}
    </div>
  )
}
