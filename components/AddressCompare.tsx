"use client"

import { AddressMetrics } from '@/lib/types'

const ACCENT_COLORS = ['#f97316', '#3b82f6', '#a855f7']

const METRICS: Array<{
  key: keyof Pick<AddressMetrics, 'aqiScore' | 'walkabilityScore' | 'groceryScore' | 'transitScore' | 'greenScore' | 'safetyScore' | 'healthcareScore' | 'schoolScore' | 'diningScore' | 'overallScore'>
  label: string
  higherIsBetter: boolean
}> = [
  { key: 'overallScore',     label: 'Overall Score',     higherIsBetter: true },
  { key: 'aqiScore',         label: 'Air Quality',        higherIsBetter: true },
  { key: 'walkabilityScore', label: 'Walkability',        higherIsBetter: true },
  { key: 'groceryScore',     label: 'Grocery Access',     higherIsBetter: true },
  { key: 'transitScore',     label: 'Transit Access',     higherIsBetter: true },
  { key: 'greenScore',       label: 'Green Space',        higherIsBetter: true },
  { key: 'safetyScore',      label: 'Safety / Crime',     higherIsBetter: true },
  { key: 'healthcareScore',  label: 'Healthcare Access',  higherIsBetter: true },
  { key: 'schoolScore',      label: 'Schools Nearby',     higherIsBetter: true },
  { key: 'diningScore',      label: 'Dining & Cafes',     higherIsBetter: true },
]

interface AddressCompareProps {
  addresses: AddressMetrics[]
  onRemove: (id: string) => void
}

function qualityColor(score: number) {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

export default function AddressCompare({ addresses, onRemove }: AddressCompareProps) {
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
                className="text-xs hover:text-white transition-colors shrink-0"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2a2a' }}>
        {METRICS.map((metric, mi) => {
          const values = addresses.map(a => a[metric.key] as number)
          const best = metric.higherIsBetter ? Math.max(...values) : Math.min(...values)

          return (
            <div
              key={metric.key}
              className="flex items-center"
              style={{
                borderBottom: mi < METRICS.length - 1 ? '1px solid #2a2a2a' : undefined,
                backgroundColor: mi % 2 === 0 ? '#1a1a1a' : '#141414',
              }}
            >
              <div className="py-3 px-4 w-36 shrink-0">
                <span style={{ color: '#a0a0a0' }} className="text-xs font-medium">
                  {metric.label}
                </span>
              </div>
              <div className="flex flex-1" style={{ borderLeft: '1px solid #2a2a2a' }}>
                {addresses.map((addr, i) => {
                  const val = addr[metric.key] as number
                  const isWinner = val === best
                  const color = qualityColor(val)

                  return (
                    <div
                      key={addr.id}
                      className="flex-1 py-3 px-4 flex items-center gap-2"
                      style={{ borderRight: i < addresses.length - 1 ? '1px solid #2a2a2a' : undefined }}
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
                      {isWinner && <span className="text-xs" style={{ color: '#f97316' }}>★</span>}
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
    </div>
  )
}
