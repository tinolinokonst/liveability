"use client"

import { useState, useEffect } from 'react'
import { ArrowLeft, Bookmark, Check, MapPin } from 'lucide-react'
import { Neighborhood, WeightConfig, Profile, PROFILE_WEIGHTS, AddressMetrics, SavedAddress } from '@/lib/types'
import { fetchFullMetrics } from '@/lib/metrics'
import { fetchSavedAddresses, saveAddress } from '@/lib/savedAddresses'
import LocalNews from './LocalNews'
import AddressResults from './AddressResults'
import { SWISS_AREAS, nearestNeighborhood } from '@/lib/neighborhoods'

const NEIGHBORHOOD_NAME_SET = new Set(SWISS_AREAS.map(n => n.name))

const PROFILES: Profile[] = ['Family', 'Young Professional', 'Retiree', 'Nature Lover']

function profileFit(n: Neighborhood, profile: Profile): number {
  const weights = PROFILE_WEIGHTS[profile]
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  if (total === 0) return 0

  const sum =
    n.walkability * weights.walkability +
    n.air * weights.air +
    n.green * weights.green +
    n.grocery * weights.grocery +
    n.transit * weights.transit +
    n.safety * weights.safety +
    n.education * weights.education +
    n.healthcare * weights.healthcare +
    n.dining * weights.dining +
    n.quiet * weights.quiet

  return Math.round((sum / total) / 10 * 10) / 10
}

function bestFit(n: Neighborhood): { profile: Profile; score: number } {
  const scores = PROFILES.map(profile => ({ profile, score: profileFit(n, profile) }))
  return scores.sort((a, b) => b.score - a.score)[0]
}

const DEFAULT_WEIGHTS: WeightConfig = {
  walkability: 20,
  air: 20,
  green: 15,
  grocery: 15,
  transit: 15,
  safety: 15,
}

const PRESETS: Array<{ label: string; weights: WeightConfig }> = [
  { label: 'Balanced',  weights: DEFAULT_WEIGHTS },
  { label: 'Clean Air', weights: { walkability: 10, air: 50, green: 15, grocery: 10, transit: 5,  safety: 10 } },
  { label: 'Walkable',  weights: { walkability: 50, air: 10, green: 10, grocery: 15, transit: 15, safety: 0  } },
  { label: 'Safest',    weights: { walkability: 10, air: 10, green: 10, grocery: 10, transit: 10, safety: 50 } },
  { label: 'Budget',    weights: { walkability: 20, air: 10, green: 10, grocery: 20, transit: 20, safety: 20 } },
]

const WEIGHT_LABELS: Array<{ key: keyof WeightConfig; label: string }> = [
  { key: 'walkability', label: 'Walkability' },
  { key: 'air',         label: 'Air Quality' },
  { key: 'green',       label: 'Green Space' },
  { key: 'grocery',     label: 'Grocery'     },
  { key: 'transit',     label: 'Transit'     },
  { key: 'safety',      label: 'Safety'      },
]

function scoreNeighborhood(n: Neighborhood, w: WeightConfig): number {
  const total = Object.values(w).reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  return Math.round(
    (n.walkability * w.walkability +
      n.air * w.air +
      n.green * w.green +
      n.grocery * w.grocery +
      n.transit * w.transit +
      n.safety * w.safety) / total
  )
}

function qualityColor(s: number) {
  if (s >= 70) return '#22c55e'
  if (s >= 40) return '#f59e0b'
  return '#ef4444'
}

function rentLabel(rent: number) {
  if (rent < 1600) return { label: 'Affordable', color: '#22c55e' }
  if (rent < 2100) return { label: 'Moderate',   color: '#f59e0b' }
  return                  { label: 'Pricey',      color: '#ef4444' }
}

function resolveNeighborhoodName(name: string | null | undefined): string | null {
  if (!name) return null
  const found = SWISS_AREAS.find(n =>
    n.name.toLowerCase() === name.toLowerCase() ||
    n.name.toLowerCase().includes(name.toLowerCase()) ||
    name.toLowerCase().includes(n.name.toLowerCase())
  )
  return found?.name ?? null
}

interface NeighborhoodFinderProps {
  userId?: string | null
  initialNeighborhoodName?: string | null
  onBack?: () => void
  backLabel?: string
  onViewAddress?: (address: string) => void
}

const MIN_RENT = 1000
const MAX_RENT = 3000

export default function NeighborhoodFinder({ userId, initialNeighborhoodName, onBack, backLabel, onViewAddress }: NeighborhoodFinderProps) {
  const [weights, setWeights] = useState<WeightConfig>(DEFAULT_WEIGHTS)
  const [activePreset, setActivePreset] = useState('Balanced')
  const [expandedNews, setExpandedNews] = useState<string | null>(null)
  const [maxBudget, setMaxBudget] = useState(MAX_RENT)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // Initialize synchronously so the detail view shows immediately on mount
  // without flashing the full rankings list first
  const [selectedName, setSelectedName] = useState<string | null>(() => resolveNeighborhoodName(initialNeighborhoodName))
  const [metrics, setMetrics] = useState<AddressMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(() => resolveNeighborhoodName(initialNeighborhoodName) !== null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedInArea, setSavedInArea] = useState<SavedAddress[]>([])

  // Fetch metrics whenever a neighborhood is selected (covers both initial mount and user clicks)
  useEffect(() => {
    if (!selectedName) return
    const n = SWISS_AREAS.find(nb => nb.name === selectedName)
    if (!n) { setMetricsLoading(false); return }

    let cancelled = false
    setMetricsLoading(true)

    fetchFullMetrics(n.name, { lat: n.lat, lng: n.lng, formattedAddress: n.name }, 800)
      .then(m => { if (!cancelled) setMetrics(m) })
      .catch(err => { if (!cancelled) setMetricsError(err instanceof Error ? err.message : 'Failed to load neighborhood data') })
      .finally(() => { if (!cancelled) setMetricsLoading(false) })

    return () => { cancelled = true }
  }, [selectedName])

  // Load saved addresses once per neighborhood view, filter to those nearest this neighborhood
  useEffect(() => {
    if (!selectedName || !userId) { setSavedInArea([]); return }
    fetchSavedAddresses()
      .then(all => {
        const street = all.filter(a => !NEIGHBORHOOD_NAME_SET.has(a.address))
        setSavedInArea(street.filter(a => nearestNeighborhood(a.lat, a.lng) === selectedName))
      })
      .catch(() => setSavedInArea([]))
  }, [selectedName, userId])

  const searchMatches = searchQuery.trim().length > 0
    ? SWISS_AREAS.filter(n =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const allRanked = [...SWISS_AREAS]
    .map(n => ({ ...n, score: scoreNeighborhood(n, weights) }))
    .sort((a, b) => b.score - a.score)

  const budgetActive = maxBudget < MAX_RENT
  const ranked = budgetActive ? allRanked.filter(n => n.rent <= maxBudget) : allRanked
  const overBudget = budgetActive ? allRanked.filter(n => n.rent > maxBudget) : []

  function applyPreset(preset: typeof PRESETS[number]) {
    setWeights(preset.weights)
    setActivePreset(preset.label)
  }

  function handleWeight(key: keyof WeightConfig, value: number) {
    setWeights(prev => ({ ...prev, [key]: value }))
    setActivePreset('Custom')
  }

  function handleSelectNeighborhood(n: Neighborhood) {
    setMetrics(null)
    setMetricsError(null)
    setSaved(false)
    setMetricsLoading(true)
    setSelectedName(n.name) // triggers the fetch useEffect
  }

  async function handleSaveNeighborhood() {
    if (!metrics || !userId) return

    setSaving(true)
    try {
      await saveAddress(userId, metrics)
      setSaved(true)
    } catch (err) {
      setMetricsError(err instanceof Error ? err.message : 'Failed to save neighborhood')
    } finally {
      setSaving(false)
    }
  }

  if (selectedName) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
              style={{ color: '#f97316', backgroundColor: '#1a1a1a', border: '1px solid #f97316' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f973161a')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1a1a1a')}
            >
              <ArrowLeft size={14} /> {backLabel ?? 'Back to AI Match results'}
            </button>
          ) : (
            <button
              onClick={() => setSelectedName(null)}
              className="text-xs transition-colors flex items-center gap-1"
              style={{ color: '#a0a0a0' }}
            >
              <ArrowLeft size={14} /> Back to neighborhood rankings
            </button>
          )}
          <span className="text-sm font-semibold text-white">{selectedName}</span>
        </div>

        {metricsError && (
          <div className="rounded-xl px-4 py-3 text-sm text-[#ef4444]" style={{ backgroundColor: '#ef44441a', border: '1px solid #ef444433' }}>
            {metricsError}
          </div>
        )}

        {metricsLoading && (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="h-3 w-16 rounded" style={{ backgroundColor: '#2a2a2a' }} />
                <div className="h-4 w-48 rounded" style={{ backgroundColor: '#2a2a2a' }} />
              </div>
              <div className="h-10 w-10 rounded" style={{ backgroundColor: '#2a2a2a' }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl p-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                  <div className="h-3 w-20 rounded mb-3" style={{ backgroundColor: '#2a2a2a' }} />
                  <div className="h-7 w-12 rounded mb-2" style={{ backgroundColor: '#2a2a2a' }} />
                  <div className="h-2 w-full rounded" style={{ backgroundColor: '#2a2a2a' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {metrics && (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p style={{ color: '#a0a0a0' }} className="text-xs mb-1">Results for</p>
                <p className="text-white font-semibold text-sm">{selectedName} (city center)</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p style={{ color: '#a0a0a0' }} className="text-xs">Overall</p>
                  <p className="text-2xl font-bold" style={{ color: '#f97316' }}>{metrics.overallScore}</p>
                </div>
                {userId && (
                  <button
                    onClick={handleSaveNeighborhood}
                    disabled={saving || saved}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                    style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
                  >
                    {saved ? <>Saved <Check size={14} /></> : saving ? 'Saving...' : 'Save this neighborhood'}
                  </button>
                )}
              </div>
            </div>

            <AddressResults metrics={metrics} />

            {savedInArea.length > 0 && (
              <div
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}
              >
                <div className="flex items-center gap-2">
                  <Bookmark size={12} style={{ color: '#f97316' }} />
                  <span className="text-xs font-semibold" style={{ color: '#a0a0a0' }}>
                    {savedInArea.length} of your saved address{savedInArea.length === 1 ? ' is' : 'es are'} in this area
                  </span>
                  <span className="text-xs" style={{ color: '#3a3a3a' }}>· approx.</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {savedInArea.map(a => (
                    <button
                      key={a.id}
                      onClick={() => onViewAddress?.(a.address)}
                      className="text-xs text-left flex items-center gap-2 transition-colors"
                      style={{ color: '#a0a0a0', cursor: onViewAddress ? 'pointer' : 'default' }}
                      onMouseEnter={e => { if (onViewAddress) e.currentTarget.style.color = '#e0e0e0' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#a0a0a0' }}
                    >
                      <MapPin size={10} className="shrink-0" style={{ color: '#a0a0a0' }} />
                      {a.address}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
          onFocus={() => { if (searchQuery) setShowDropdown(true) }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="Jump to a city..."
          className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[#a0a0a0] outline-none focus:ring-2 focus:ring-[#f97316]"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
        />
        {showDropdown && searchMatches.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-10"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
          >
            {searchMatches.map(n => (
              <button
                key={n.name}
                onMouseDown={() => {
                  setSearchQuery('')
                  setShowDropdown(false)
                  handleSelectNeighborhood(n)
                }}
                className="w-full text-left px-4 py-3 text-sm transition-colors"
                style={{ color: '#e0e0e0', borderBottom: '1px solid #2a2a2a' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2a2a2a')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {n.name}
              </button>
            ))}
          </div>
        )}
        {showDropdown && searchQuery.trim().length > 0 && searchMatches.length === 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-1 rounded-xl px-4 py-3 text-sm z-10"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#a0a0a0' }}
          >
            No neighborhoods match &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </div>

      {/* Presets */}
      <div>
        <p style={{ color: '#a0a0a0' }} className="text-xs font-medium mb-3 uppercase tracking-wider">Quick presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: activePreset === p.label ? '#f97316' : '#2a2a2a',
                color: activePreset === p.label ? 'white' : '#a0a0a0',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Weight sliders */}
      <div
        className="rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-4"
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
      >
        {WEIGHT_LABELS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span style={{ color: '#a0a0a0' }} className="text-xs">{label}</span>
              <span className="text-xs font-bold text-white">{weights[key]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={weights[key]}
              onChange={e => handleWeight(key, Number(e.target.value))}
              className="w-full"
            />
          </div>
        ))}
      </div>

      {/* Budget filter */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#a0a0a0' }}>
              Monthly budget
            </span>
            <span className="text-xs ml-2" style={{ color: '#a0a0a0' }}>
              (Neighborhoods only · est. rent)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: maxBudget < MAX_RENT ? '#f97316' : '#a0a0a0' }}>
              {maxBudget < MAX_RENT ? `≤ CHF ${maxBudget.toLocaleString()}/mo` : 'Any budget'}
            </span>
            {maxBudget < MAX_RENT && (
              <button
                onClick={() => setMaxBudget(MAX_RENT)}
                className="text-xs px-2 py-0.5 rounded-md"
                style={{ backgroundColor: '#2a2a2a', color: '#a0a0a0' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <input
          type="range"
          min={MIN_RENT}
          max={MAX_RENT}
          step={50}
          value={maxBudget}
          onChange={e => setMaxBudget(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: '#a0a0a0' }}>CHF {MIN_RENT.toLocaleString()}/mo</span>
          <span className="text-xs" style={{ color: '#a0a0a0' }}>No limit</span>
        </div>
      </div>

      {/* Rankings */}
      <div className="flex flex-col gap-3">
        <p style={{ color: '#a0a0a0' }} className="text-xs font-medium uppercase tracking-wider">
          {budgetActive
            ? `${ranked.length} cit${ranked.length === 1 ? 'y' : 'ies'} within budget`
            : 'Swiss cities ranked'}
        </p>
        {ranked.length === 0 && (
          <div
            className="rounded-xl px-4 py-6 text-center text-sm"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#a0a0a0' }}
          >
            No cities found within this budget. Try raising the limit.
          </div>
        )}
        {ranked.map((n, i) => {
          const rent = rentLabel(n.rent)
          const bar = qualityColor(n.score)
          const fit = bestFit(n)
          return (
            <div
              key={n.name}
              onClick={() => handleSelectNeighborhood(n)}
              className="rounded-xl p-4 flex gap-4 items-start cursor-pointer transition-colors hover:border-[#f97316]"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              <div
                className="text-lg font-bold shrink-0 w-8 text-center"
                style={{ color: i === 0 ? '#f97316' : '#a0a0a0' }}
              >
                #{i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-white text-sm">{n.name}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ color: rent.color, backgroundColor: `${rent.color}1a` }}
                  >
                    CHF {n.rent.toLocaleString()}/mo · {rent.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {n.notes.map(note => (
                    <span
                      key={note}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#2a2a2a', color: '#a0a0a0' }}
                    >
                      {note}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#2a2a2a' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${n.score}%`, backgroundColor: bar }}
                    />
                  </div>
                  <span className="text-sm font-bold text-white shrink-0">{n.score}/100</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ color: '#f97316', backgroundColor: '#f973161a' }}
                  >
                    Great fit for: {fit.profile} ({fit.score.toFixed(1)}/10)
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setExpandedNews(expandedNews === n.name ? null : n.name) }}
                    className="text-xs px-2 py-1 rounded-full font-medium transition-colors"
                    style={{ color: '#a0a0a0', backgroundColor: '#2a2a2a' }}
                  >
                    {expandedNews === n.name ? 'Hide local news' : 'Show local news'}
                  </button>
                </div>

                {expandedNews === n.name && (
                  <div className="mt-3">
                    <LocalNews query={n.name} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {overBudget.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          <p style={{ color: '#a0a0a0' }} className="text-xs font-medium uppercase tracking-wider">
            Over budget ({overBudget.length})
          </p>
          {overBudget.map(n => {
            const rent = rentLabel(n.rent)
            return (
              <div
                key={n.name}
                className="rounded-xl px-4 py-3 flex items-center gap-3 opacity-40"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
              >
                <span className="font-semibold text-sm text-white">{n.name}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ color: rent.color, backgroundColor: `${rent.color}1a` }}
                >
                  CHF {n.rent.toLocaleString()}/mo
                </span>
                <span className="text-xs ml-auto" style={{ color: '#a0a0a0' }}>
                  score {n.score}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <p style={{ color: '#a0a0a0' }} className="text-xs text-center">
        Scores based on real characteristics of each Swiss city. Adjust weights to match your priorities.
      </p>
    </div>
  )
}
