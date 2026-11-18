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
import FeedbackButton from '@/components/FeedbackButton'
import UsLiveBanner from '@/components/UsLiveBanner'
import UsAreaFinder from '@/components/UsAreaFinder'
import { useVisitorCountry } from '@/components/VisitorCountry'
import CoverageNote, { AddressKind } from '@/components/CoverageNote'
import { HouseholdProvider } from '@/components/HouseholdContext'
import { useFeatureFlags } from '@/components/FeatureFlags'
import { AddressMetrics, AiMatchListingsState } from '@/lib/types'
import { APP_WIDTH } from '@/components/appLayout'
import { Expand, StaggerItem, ViewSwap } from '@/components/motion'

type Tab = 'search' | 'neighborhoods' | 'saved' | 'ai-match'
const TAB_ORDER: Tab[] = ['search', 'neighborhoods', 'saved', 'ai-match']

function Dashboard() {
  const router = useRouter()
  const { us } = useFeatureFlags()
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
  // Slide direction for the tab swap: following a link into a detail view goes
  // forward, its "Back to ..." goes back; plain tab clicks follow tab order
  const [navDir, setNavDir] = useState<1 | -1 | undefined>(undefined)
  // Areas tab country; US visitors start on the US. A Swiss area opened from
  // AI Match or Saved always shows the Swiss view.
  const visitorCountry = useVisitorCountry()
  const [areaCountry, setAreaCountry] = useState<'CH' | 'US'>(() => (us && visitorCountry === 'US' ? 'US' : 'CH'))
  const areaView = us && !targetNeighborhood ? areaCountry : 'CH'

  function navigate(next: Tab, dir: 1 | -1) {
    setNavDir(dir)
    setTab(next)
  }

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
    setNavDir(undefined)
    setTab(newTab)
  }

  // AI Match → neighborhood detail
  function handleViewNeighborhood(name: string) {
    setTargetNeighborhood(name)
    setNeighborhoodNavSource('ai-match')
    navigate('neighborhoods', 1)
  }

  // Saved Addresses → neighborhood detail
  function handleViewNeighborhoodFromSaved(name: string) {
    setTargetNeighborhood(name)
    setNeighborhoodNavSource('saved')
    navigate('neighborhoods', 1)
  }

  // AI Match → address search (shows "back to AI Match" button)
  function handleViewAddress(address: string) {
    setTargetAddress(address)
    setNeighborhoodSearchAddress(null)
    navigate('search', 1)
  }

  // Neighborhood detail → address search (no back button — neutral navigation)
  function handleViewAddressFromNeighborhood(address: string) {
    setNeighborhoodSearchAddress(address)
    setTargetAddress(null)
    navigate('search', 1)
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

      <div className={`${APP_WIDTH} mx-auto px-6 pt-8 pb-24 sm:pb-8`}>
        {/* Page title */}
        {/* Heading, banner and tab bar are centred on the page */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Find your next home base</h1>
          <p style={{ color: '#a0a0a0' }} className="text-sm">
            Search any address or explore area rankings
          </p>
          <p className="text-xs font-semibold mt-1" style={{ color: '#f97316' }}>
            <CoverageNote />
          </p>
        </div>

        {/* US visitors only, while US coverage is on; renders nothing otherwise */}
        <UsLiveBanner className="mb-8 max-w-2xl mx-auto" />

        {/* Tabs */}
        <div
          className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 p-1 rounded-xl mb-8 sm:w-fit sm:mx-auto"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          {([
            { key: 'search' as Tab,        label: 'Address Search',  icon: null },
            { key: 'neighborhoods' as Tab, label: 'Areas',           icon: null },
            { key: 'saved' as Tab,         label: 'Saved Addresses', icon: null },
            { key: 'ai-match' as Tab,      label: 'AI Match',        icon: Sparkles },
          ] as const).map(t => {
            const active = tab === t.key
            const isAi = t.key === 'ai-match'
            return (
              <button
                key={t.key}
                onClick={() => handleTabClick(t.key)}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all"
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

        <ViewSwap viewKey={tab} depth={TAB_ORDER.indexOf(tab)} direction={navDir}>
        {tab === 'search' && (
          <div className="flex flex-col">
            {/* Search panel */}
            <div
              className="rounded-2xl p-4 sm:p-6"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              <h2 className="text-white font-bold mb-1">Search an address</h2>
              <p style={{ color: '#a0a0a0' }} className="text-xs mb-6">
                Enter any <AddressKind /> to get real air quality and amenity scores
              </p>
              <AddressSearch
                onAdd={addToCompare}
                compareCount={compared.length}
                userId={userId}
                initialAddress={targetAddress ?? neighborhoodSearchAddress}
                onBack={targetAddress ? () => navigate('ai-match', -1) : undefined}
              />
            </div>

            {/* Comparison panel: grows into place and fades in */}
            <Expand>
            {compared.length > 0 && (
              <StaggerItem className="pt-8">
              <div
                className="rounded-2xl p-4 sm:p-6"
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
              </StaggerItem>
            )}
            </Expand>
          </div>
        )}

        {tab === 'neighborhoods' && (
          <div
            className="rounded-2xl p-4 sm:p-6"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
          >
            {!targetNeighborhood && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                  <h2 className="text-white font-bold">Areas</h2>
                  {us && (
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }} role="radiogroup" aria-label="Country">
                      {([['CH', 'Switzerland'], ['US', 'United States']] as const).map(([c, label]) => (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={areaView === c}
                          onClick={() => setAreaCountry(c)}
                          className="h-8 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-colors"
                          style={areaView === c ? { backgroundColor: '#f97316', color: 'white' } : { color: '#a0a0a0' }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p style={{ color: '#a0a0a0' }} className="text-xs mb-6">
                  {areaView === 'US'
                    ? 'Pick a state, then any city, town, neighborhood or ZIP code in it.'
                    : 'Adjust the sliders to rank areas based on what matters to you. Rankings cover Switzerland.'}
                </p>
              </>
            )}
            {/* Switzerland: ranked areas (unchanged). US: state, then an area in it */}
            <ViewSwap viewKey={areaView} depth={areaView === 'US' ? 1 : 0}>
              {areaView === 'US' ? (
                <UsAreaFinder userId={userId} />
              ) : (
                <NeighborhoodFinder
                  key={targetNeighborhood ?? '__list__'}
                  userId={userId}
                  initialNeighborhoodName={targetNeighborhood}
                  onBack={neighborhoodNavSource ? () => navigate(neighborhoodNavSource === 'ai-match' ? 'ai-match' : 'saved', -1) : undefined}
                  backLabel={neighborhoodNavSource === 'ai-match' ? 'Back to AI Match results' : neighborhoodNavSource === 'saved' ? 'Back to saved addresses' : undefined}
                  onViewAddress={handleViewAddressFromNeighborhood}
                />
              )}
            </ViewSwap>
          </div>
        )}

        {tab === 'saved' && (
          <div
            className="rounded-2xl p-4 sm:p-6"
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
            className="rounded-2xl p-4 sm:p-6"
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
        </ViewSwap>
      </div>

      {userId && <FeedbackButton userId={userId} page={`/dashboard?tab=${tab}`} />}
    </div>
  )
}

// Household budget inputs are shared by every tab (results, Compare, AI Match)
export default function DashboardPage() {
  return (
    <HouseholdProvider>
      <Dashboard />
    </HouseholdProvider>
  )
}
