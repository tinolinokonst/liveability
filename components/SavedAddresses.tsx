"use client"

import { useEffect, useState } from 'react'
import { ArrowLeft, MapPin, Building2 } from 'lucide-react'
import {
  fetchSavedAddresses,
  updateSavedAddressMetrics,
  deleteSavedAddress,
} from '@/lib/savedAddresses'
import { fetchFullMetrics } from '@/lib/metrics'
import { AddressMetrics, SavedAddress } from '@/lib/types'
import { ALL_AREAS, nearestNeighborhood } from '@/lib/neighborhoods'
import AddressResults from './AddressResults'

const NEIGHBORHOOD_NAMES = new Set(ALL_AREAS.map(n => n.name))

interface SavedAddressesProps {
  onAdd?: (metrics: AddressMetrics) => void
  compareCount?: number
  onViewNeighborhood?: (name: string) => void
}

function isMetricsIncomplete(metrics: AddressMetrics): boolean {
  return (
    metrics.groceryCount === undefined ||
    metrics.transitCount === undefined ||
    metrics.parkCount === undefined ||
    metrics.schoolCount === undefined ||
    metrics.healthcareCount === undefined ||
    metrics.diningCount === undefined ||
    metrics.libraryCount === undefined ||
    metrics.bankCount === undefined ||
    metrics.worshipCount === undefined ||
    metrics.parkingCount === undefined ||
    metrics.places === undefined ||
    metrics.places?.school === undefined ||
    metrics.places?.healthcare === undefined ||
    metrics.places?.dining === undefined ||
    metrics.places?.library === undefined ||
    metrics.places?.bank === undefined ||
    metrics.places?.worship === undefined ||
    metrics.places?.parking === undefined
  )
}

export default function SavedAddresses({ onAdd, compareCount = 0, onViewNeighborhood }: SavedAddressesProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [neighborhoodMap, setNeighborhoodMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSavedAddresses()
      setAddresses(data)
      // Compute neighborhood assignments synchronously (pure CPU, no async needed)
      const map = new Map<string, string>()
      for (const a of data) {
        if (!NEIGHBORHOOD_NAMES.has(a.address)) {
          map.set(a.id, nearestNeighborhood(a.lat, a.lng))
        }
      }
      setNeighborhoodMap(map)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved addresses')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh(saved: SavedAddress) {
    setRefreshingId(saved.id)
    setError(null)
    try {
      const radius = saved.metrics.radius ?? 800
      const location = { lat: saved.lat, lng: saved.lng, formattedAddress: saved.address }
      const metrics = await fetchFullMetrics(saved.address, location, radius, saved.metrics.id)
      await updateSavedAddressMetrics(saved.id, metrics)
      setAddresses(prev => prev.map(a => (a.id === saved.id ? { ...a, metrics } : a)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data')
    } finally {
      setRefreshingId(null)
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id)
    setError(null)
    try {
      await deleteSavedAddress(id)
      setAddresses(prev => prev.filter(a => a.id !== id))
      setNeighborhoodMap(prev => { const m = new Map(prev); m.delete(id); return m })
      setSelectedId(prev => (prev === id ? null : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove address')
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return <p style={{ color: '#a0a0a0' }} className="text-sm">Loading saved addresses...</p>
  }

  const selected = addresses.find(a => a.id === selectedId) ?? null

  if (selected) {
    const hood = !NEIGHBORHOOD_NAMES.has(selected.address) ? neighborhoodMap.get(selected.id) : null

    return (
      <div className="flex flex-col gap-4">
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm text-[#ef4444]" style={{ backgroundColor: '#ef44441a', border: '1px solid #ef444433' }}>
            {error}
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => setSelectedId(null)}
              className="text-xs mb-2 transition-colors flex items-center gap-1"
              style={{ color: '#a0a0a0' }}
            >
              <ArrowLeft size={14} /> Back to saved addresses
            </button>
            <p style={{ color: '#a0a0a0' }} className="text-xs mb-1">Results for</p>
            <p className="text-white font-semibold text-sm">{selected.metrics.location?.formattedAddress ?? selected.address}</p>
            <p style={{ color: '#a0a0a0' }} className="text-xs mt-1">
              Saved on {new Date(selected.created_at).toLocaleDateString()}
            </p>
            {hood && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin size={12} style={{ color: '#a0a0a0' }} />
                <span className="text-xs" style={{ color: '#a0a0a0' }}>Located in</span>
                {onViewNeighborhood ? (
                  <button
                    onClick={() => onViewNeighborhood(hood)}
                    className="text-xs font-semibold transition-colors"
                    style={{ color: '#f97316' }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    {hood} →
                  </button>
                ) : (
                  <span className="text-xs font-semibold" style={{ color: '#a0a0a0' }}>{hood}</span>
                )}
              </div>
            )}
            {isMetricsIncomplete(selected.metrics) && (
              <p
                className="text-xs font-semibold px-2 py-1 rounded-lg w-fit mt-2"
                style={{ color: '#f97316', backgroundColor: '#f973161a', border: '1px solid #f9731633' }}
              >
                Data outdated — click &quot;Refresh data&quot; to load new metrics
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p style={{ color: '#a0a0a0' }} className="text-xs">Overall</p>
              <p className="text-2xl font-bold" style={{ color: '#f97316' }}>{selected.metrics.overallScore ?? '—'}</p>
            </div>
            <button
              onClick={() => handleRefresh(selected)}
              disabled={refreshingId === selected.id}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
            >
              {refreshingId === selected.id ? 'Refreshing...' : 'Refresh data'}
            </button>
            <button
              onClick={() => handleRemove(selected.id)}
              disabled={removingId === selected.id}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{ backgroundColor: '#2a2a2a', color: '#ef4444', border: '1px solid #3a3a3a' }}
            >
              {removingId === selected.id ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>

        <AddressResults metrics={selected.metrics} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm text-[#ef4444]" style={{ backgroundColor: '#ef44441a', border: '1px solid #ef444433' }}>
          {error}
        </div>
      )}

      {addresses.length === 0 && (
        <p style={{ color: '#a0a0a0' }} className="text-sm">
          You haven&apos;t saved any addresses yet. Search for an address and click &quot;Save this address&quot; to add it here.
        </p>
      )}

      {addresses.length > 0 && (() => {
        const streetAddresses = addresses.filter(a => !NEIGHBORHOOD_NAMES.has(a.address))
        const savedNeighborhoods = addresses.filter(a => NEIGHBORHOOD_NAMES.has(a.address))

        const renderCard = (saved: SavedAddress, isNeighborhood: boolean) => {
          const hood = !isNeighborhood ? neighborhoodMap.get(saved.id) : null
          return (
            <div
              key={saved.id}
              onClick={() => setSelectedId(saved.id)}
              className="rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-colors hover:border-[#f97316]"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  {isNeighborhood
                    ? <Building2 size={14} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
                    : <MapPin size={14} className="shrink-0 mt-0.5" style={{ color: '#a0a0a0' }} />
                  }
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm leading-tight">{saved.address}</p>
                    {hood && (
                      <button
                        onClick={e => { e.stopPropagation(); onViewNeighborhood?.(hood) }}
                        className="text-xs flex items-center gap-1 mt-0.5 transition-colors"
                        style={{ color: '#a0a0a0' }}
                        onMouseEnter={e => { if (onViewNeighborhood) e.currentTarget.style.color = '#f97316' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#a0a0a0' }}
                      >
                        <MapPin size={10} style={{ color: 'inherit' }} />
                        {hood}
                        {onViewNeighborhood && <span style={{ color: '#f97316' }}> →</span>}
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p style={{ color: '#a0a0a0' }} className="text-xs">Overall</p>
                  <p className="text-xl font-bold" style={{ color: '#f97316' }}>{saved.metrics.overallScore ?? '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: '#a0a0a0' }}>
                <div>
                  <p className="font-semibold text-white">{saved.metrics.aqi ?? '—'}</p>
                  <p>AQI</p>
                </div>
                <div>
                  <p className="font-semibold text-white">{saved.metrics.walkabilityScore ?? '—'}</p>
                  <p>Walkability</p>
                </div>
                <div>
                  <p className="font-semibold text-white">{saved.metrics.safetyScore ?? '—'}</p>
                  <p>Safety</p>
                </div>
              </div>

              <p style={{ color: '#a0a0a0' }} className="text-xs">
                Saved {new Date(saved.created_at).toLocaleDateString()}
              </p>

              {isMetricsIncomplete(saved.metrics) && (
                <p
                  className="text-xs font-semibold px-2 py-1 rounded-lg w-fit"
                  style={{ color: '#f97316', backgroundColor: '#f973161a', border: '1px solid #f9731633' }}
                >
                  Data outdated — refresh to load new metrics
                </p>
              )}

              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={e => { e.stopPropagation(); handleRefresh(saved) }}
                  disabled={refreshingId === saved.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
                >
                  {refreshingId === saved.id ? 'Refreshing...' : 'Refresh data'}
                </button>
                {onAdd && compareCount < 3 && (
                  <button
                    onClick={e => { e.stopPropagation(); onAdd(saved.metrics) }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                    style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
                  >
                    + Compare
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); handleRemove(saved.id) }}
                  disabled={removingId === saved.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ml-auto"
                  style={{ backgroundColor: '#2a2a2a', color: '#ef4444', border: '1px solid #3a3a3a' }}
                >
                  {removingId === saved.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          )
        }

        // Group street addresses by neighborhood when there are 3 or more
        const renderStreetAddresses = () => {
          if (streetAddresses.length >= 3 && neighborhoodMap.size > 0) {
            const byNeighborhood = new Map<string, SavedAddress[]>()
            for (const a of streetAddresses) {
              const n = neighborhoodMap.get(a.id) ?? 'Other'
              if (!byNeighborhood.has(n)) byNeighborhood.set(n, [])
              byNeighborhood.get(n)!.push(a)
            }
            const groups = [...byNeighborhood.entries()].sort((a, b) => b[1].length - a[1].length)
            return (
              <div className="flex flex-col gap-5">
                {groups.map(([hood, addrs]) => (
                  <div key={hood} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} style={{ color: '#a0a0a0' }} />
                      <span className="text-xs font-semibold" style={{ color: '#a0a0a0' }}>
                        {hood} ({addrs.length})
                      </span>
                      {onViewNeighborhood && (
                        <button
                          onClick={() => onViewNeighborhood(hood)}
                          className="text-xs transition-colors ml-1"
                          style={{ color: '#f97316' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          View area →
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {addrs.map(saved => renderCard(saved, false))}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {streetAddresses.map(saved => renderCard(saved, false))}
            </div>
          )
        }

        return (
          <>
            {streetAddresses.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <MapPin size={13} style={{ color: '#a0a0a0' }} />
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#a0a0a0' }}>
                    Saved Addresses
                  </span>
                </div>
                {renderStreetAddresses()}
              </div>
            )}

            {savedNeighborhoods.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Building2 size={13} style={{ color: '#f97316' }} />
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#a0a0a0' }}>
                    Saved Areas
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {savedNeighborhoods.map(saved => renderCard(saved, true))}
                </div>
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}
