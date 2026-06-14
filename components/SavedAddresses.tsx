"use client"

import { useEffect, useState } from 'react'
import {
  fetchSavedAddresses,
  updateSavedAddressMetrics,
  deleteSavedAddress,
} from '@/lib/savedAddresses'
import { fetchFullMetrics } from '@/lib/metrics'
import { AddressMetrics, SavedAddress } from '@/lib/types'
import AddressResults from './AddressResults'

interface SavedAddressesProps {
  onAdd?: (metrics: AddressMetrics) => void
  compareCount?: number
}

export default function SavedAddresses({ onAdd, compareCount = 0 }: SavedAddressesProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
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
              className="text-xs mb-2 transition-colors"
              style={{ color: '#a0a0a0' }}
            >
              ← Back to saved addresses
            </button>
            <p style={{ color: '#a0a0a0' }} className="text-xs mb-1">Results for</p>
            <p className="text-white font-semibold text-sm">{selected.metrics.location.formattedAddress}</p>
            <p style={{ color: '#a0a0a0' }} className="text-xs mt-1">
              Saved on {new Date(selected.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p style={{ color: '#a0a0a0' }} className="text-xs">Overall</p>
              <p className="text-2xl font-bold" style={{ color: '#f97316' }}>{selected.metrics.overallScore}</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {addresses.map(saved => (
          <div
            key={saved.id}
            onClick={() => setSelectedId(saved.id)}
            className="rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-colors hover:border-[#f97316]"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-white font-semibold text-sm">{saved.address}</p>
              <div className="text-right shrink-0">
                <p style={{ color: '#a0a0a0' }} className="text-xs">Overall</p>
                <p className="text-xl font-bold" style={{ color: '#f97316' }}>{saved.metrics.overallScore}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: '#a0a0a0' }}>
              <div>
                <p className="font-semibold text-white">{saved.metrics.aqi}</p>
                <p>AQI</p>
              </div>
              <div>
                <p className="font-semibold text-white">{saved.metrics.walkabilityScore}</p>
                <p>Walkability</p>
              </div>
              <div>
                <p className="font-semibold text-white">{saved.metrics.safetyScore}</p>
                <p>Safety</p>
              </div>
            </div>

            <p style={{ color: '#a0a0a0' }} className="text-xs">
              Saved {new Date(saved.created_at).toLocaleDateString()}
            </p>

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
        ))}
      </div>
    </div>
  )
}
