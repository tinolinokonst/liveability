"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AddressSearch from '@/components/AddressSearch'
import AddressCompare from '@/components/AddressCompare'
import NeighborhoodFinder from '@/components/NeighborhoodFinder'
import SavedAddresses from '@/components/SavedAddresses'
import { AddressMetrics } from '@/lib/types'
import Link from 'next/link'

type Tab = 'search' | 'neighborhoods' | 'saved'

export default function Dashboard() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('search')
  const [compared, setCompared] = useState<AddressMetrics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/auth')
      } else {
        setUserEmail(data.session.user.email ?? null)
        setUserId(data.session.user.id)
        setLoading(false)
      }
    })
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/auth')
  }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f0f' }}>
        <div className="text-sm" style={{ color: '#a0a0a0' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f0f' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-6 py-4"
        style={{ backgroundColor: '#0f0f0f', borderBottom: '1px solid #1a1a1a' }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-black text-white text-lg tracking-tight">
            liveability
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/how-it-works"
              className="text-xs font-medium transition-colors hidden sm:block"
              style={{ color: '#a0a0a0' }}
            >
              How It Works
            </Link>
            {userEmail && (
              <span className="text-xs hidden sm:block" style={{ color: '#a0a0a0' }}>
                {userEmail}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: '#1a1a1a', color: '#a0a0a0', border: '1px solid #2a2a2a' }}
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Columbus, Ohio</h1>
          <p style={{ color: '#a0a0a0' }} className="text-sm">
            Search any address or explore neighborhood rankings
          </p>
        </div>

        {/* Tabs */}
        <div
          className="flex p-1 rounded-xl mb-8 w-fit"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          {([
            { key: 'search' as Tab, label: 'Address Search' },
            { key: 'neighborhoods' as Tab, label: 'Neighborhoods' },
            { key: 'saved' as Tab, label: 'Saved Addresses' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                backgroundColor: tab === t.key ? '#f97316' : 'transparent',
                color: tab === t.key ? 'white' : '#a0a0a0',
              }}
            >
              {t.label}
            </button>
          ))}
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
                Enter any Columbus, OH address to get real air quality and amenity scores
              </p>
              <AddressSearch onAdd={addToCompare} compareCount={compared.length} userId={userId} />
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
            <h2 className="text-white font-bold mb-1">Columbus Neighborhoods</h2>
            <p style={{ color: '#a0a0a0' }} className="text-xs mb-6">
              Adjust the sliders to rank neighborhoods based on what matters to you
            </p>
            <NeighborhoodFinder userId={userId} />
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
            <SavedAddresses onAdd={addToCompare} compareCount={compared.length} />
          </div>
        )}
      </div>
    </div>
  )
}
