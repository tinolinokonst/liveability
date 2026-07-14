"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import AddressSearch from '@/components/AddressSearch'
import AddressCompare from '@/components/AddressCompare'
import NeighborhoodFinder from '@/components/NeighborhoodFinder'
import SavedAddresses from '@/components/SavedAddresses'
import AiMatch from '@/components/AiMatch'
import AppHeader from '@/components/AppHeader'
import { AddressMetrics, AiMatchListingsState } from '@/lib/types'

type Tab = 'search' | 'neighborhoods' | 'saved' | 'ai-match'

export default function Dashboard() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('search')
  const [compared, setCompared] = useState<AddressMetrics[]>([])
  const [loading, setLoading] = useState(true)

  // AI Match state — lifted so results persist across tab switches
  const [aiDescription, setAiDescription] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiListingsState, setAiListingsState] = useState<AiMatchListingsState | null>(null)

  // Navigation targets
  const [targetNeighborhood, setTargetNeighborhood] = useState<string | null>(null)
  const [neighborhoodNavSource, setNeighborhoodNavSource] = useState<'ai-match' | 'saved' | null>(null)
  const [targetAddress, setTargetAddress] = useState<string | null>(null)
  // Address to pre-fill in Search when navigating from Neighborhoods (no "back" button shown)
  const [neighborhoodSearchAddress, setNeighborhoodSearchAddress] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/auth')
      } else {
        setUserId(data.session.user.id)
        setLoading(false)
      }
    })
  }, [router])

  function addToCompare(metrics: AddressMetrics) {
    setCompared(prev => {
      if (prev.find(a => a.id === metrics.id)) return prev
      if (prev.length >= 3) return [...prev.slice(1), metrics]
      return [...prev, metrics]
    })
  }

  function removeFromCompare(id: string) {
    setCompared(prev => prev.filter(a => a.id !== id))
  }

  // Manual tab bar click — clears all navigation targets
  function handleTabClick(newTab: Tab) {
    setTargetNeighborhood(null)
    setNeighborhoodNavSource(null)
    setTargetAddress(null)
    setNeighborhoodSearchAddress(null)
    setTab(newTab)
  }

  // AI Match → neighborhood detail
  function handleViewNeighborhood(name: string) {
    setTargetNeighborhood(name)
    setNeighborhoodNavSource('ai-match')
    setTab('neighborhoods')
  }

  // Saved Addresses → neighborhood detail
  function handleViewNeighborhoodFromSaved(name: string) {
    setTargetNeighborhood(name)
    setNeighborhoodNavSource('saved')
    setTab('neighborhoods')
  }

  // AI Match → address search (shows "back to AI Match" button)
  function handleViewAddress(address: string) {
    setTargetAddress(address)
    setNeighborhoodSearchAddress(null)
    setTab('search')
  }

  // Neighborhood detail → address search (no back button — neutral navigation)
  function handleViewAddressFromNeighborhood(address: string) {
    setNeighborhoodSearchAddress(address)
    setTargetAddress(null)
    setTab('search')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f0f' }}>
        <div className="text-sm" style={{ color: '#a0a0a0' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f0f' }}>
      <AppHeader currentPage="dashboard" />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Find your next neighborhood</h1>
          <p style={{ color: '#a0a0a0' }} className="text-sm">
            Search any address or explore neighborhood rankings
          </p>
          <p className="text-xs font-semibold mt-1" style={{ color: '#f97316' }}>
            Currently covering Switzerland
          </p>
        </div>

        {/* Tabs */}
        <div
          className="flex flex-wrap gap-1 p-1 rounded-xl mb-8 w-fit"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          {([
            { key: 'search' as Tab,        label: 'Address Search',  icon: null },
            { key: 'neighborhoods' as Tab, label: 'Neighborhoods',   icon: null },
            { key: 'saved' as Tab,         label: 'Saved Addresses', icon: null },
            { key: 'ai-match' as Tab,      label: 'AI Match',        icon: Sparkles },
          ] as const).map(t => {
            const active = tab === t.key
            const isAi = t.key === 'ai-match'
            return (
              <button
                key={t.key}
                onClick={() => handleTabClick(t.key)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: active
                    ? (isAi ? '#f97316' : '#f97316')
                    : (isAi ? '#f973160f' : 'transparent'),
                  color: active ? 'white' : (isAi ? '#f97316' : '#a0a0a0'),
                  border: isAi && !active ? '1px solid #f9731633' : '1px solid transparent',
                }}
              >
                {t.icon && <t.icon size={13} />}
                {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'search' && (
          <div className="flex flex-col gap-8">
            {/* Search panel */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              <h2 className="text-white font-bold mb-1">Search an address</h2>
              <p style={{ color: '#a0a0a0' }} className="text-xs mb-6">
                Enter any Swiss address to get real air quality and amenity scores
              </p>
              <AddressSearch
                onAdd={addToCompare}
                compareCount={compared.length}
                userId={userId}
                initialAddress={targetAddress ?? neighborhoodSearchAddress}
                onBack={targetAddress ? () => setTab('ai-match') : undefined}
              />
            </div>

            {/* Comparison panel */}
            {compared.length > 0 && (
              <div
                className="rounded-2xl p-6"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-white font-bold mb-1">
                      Comparison{' '}
                      <span style={{ color: '#a0a0a0' }} className="font-normal text-sm">
                        ({compared.length}/3)
                      </span>
                    </h2>
                    <p style={{ color: '#a0a0a0' }} className="text-xs">
                      Side-by-side breakdown of searched addresses
                    </p>
                  </div>
                  <button
                    onClick={() => setCompared([])}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ color: '#a0a0a0', backgroundColor: '#2a2a2a' }}
                  >
                    Clear all
                  </button>
                </div>
                <AddressCompare addresses={compared} onRemove={removeFromCompare} />
              </div>
            )}
          </div>
        )}

        {tab === 'neighborhoods' && (
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
          >
            {!targetNeighborhood && (
              <>
                <h2 className="text-white font-bold mb-1">Neighborhoods</h2>
                <p style={{ color: '#a0a0a0' }} className="text-xs mb-6">
                  Adjust the sliders to rank cities based on what matters to you. Currently covering Switzerland.
                </p>
              </>
            )}
            <NeighborhoodFinder
              key={targetNeighborhood ?? '__list__'}
              userId={userId}
              initialNeighborhoodName={targetNeighborhood}
              onBack={neighborhoodNavSource ? () => setTab(neighborhoodNavSource === 'ai-match' ? 'ai-match' : 'saved') : undefined}
              backLabel={neighborhoodNavSource === 'ai-match' ? 'Back to AI Match results' : neighborhoodNavSource === 'saved' ? 'Back to saved addresses' : undefined}
              onViewAddress={handleViewAddressFromNeighborhood}
            />
          </div>
        )}

        {tab === 'saved' && (
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
          >
            <h2 className="text-white font-bold mb-1">Saved Addresses</h2>
            <p style={{ color: '#a0a0a0' }} className="text-xs mb-6">
              Addresses you&apos;ve saved, with their last-fetched metrics
            </p>
            <SavedAddresses onAdd={addToCompare} compareCount={compared.length} onViewNeighborhood={handleViewNeighborhoodFromSaved} />
          </div>
        )}

        {tab === 'ai-match' && (
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
          >
            <AiMatch
              description={aiDescription}
              response={aiResponse}
              listingsState={aiListingsState}
              onDescriptionChange={setAiDescription}
              onResponseChange={setAiResponse}
              onListingsChange={setAiListingsState}
              onViewNeighborhood={handleViewNeighborhood}
              onViewAddress={handleViewAddress}
            />
          </div>
        )}
      </div>
    </div>
  )
}
