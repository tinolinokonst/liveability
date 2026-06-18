"use client"

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, RotateCcw, Database, Home, ExternalLink } from 'lucide-react'
import { COLUMBUS_NEIGHBORHOODS } from '@/lib/neighborhoods'

const EXAMPLE_PROMPTS = [
  "I work from home and want a quiet neighborhood with good coffee shops and parks within walking distance. Budget around $1,400/month.",
  "Young professional commuting downtown, love restaurants and nightlife, don't have a car so transit is essential. Can spend up to $1,800.",
  "Family with two kids, safety and good schools are the top priority. We need a grocery store nearby and prefer a quieter area. Budget $1,300.",
  "Retired couple looking for clean air, green spaces, and easy access to healthcare. Prefer quiet streets and walkable amenities.",
]

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-white mt-5 mb-1.5">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-black mt-6 mb-2" style="color:#f97316">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc" style="color:#a0a0a0">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

// Parse neighborhood names from AI response headings (### 1. Name, ### 2. Name, ...)
function parseNeighborhoodNames(text: string): string[] {
  const matches = [...text.matchAll(/^###\s+\d+\.\s+(.+)$/gm)]
  return matches.map(m => m[1].trim()).filter(Boolean)
}

// Find a neighborhood's coordinates by name (case-insensitive substring match)
function findNeighborhoodCoords(name: string): { lat: number; lng: number } | null {
  const lower = name.toLowerCase()
  const match = COLUMBUS_NEIGHBORHOODS.find(n =>
    n.name.toLowerCase() === lower ||
    n.name.toLowerCase().includes(lower) ||
    lower.includes(n.name.toLowerCase())
  )
  return match ? { lat: match.lat, lng: match.lng } : null
}

interface RentListing {
  id: string
  formattedAddress: string
  price: number
  bedrooms?: number
  bathrooms?: number
  squareFootage?: number
  propertyType?: string
  daysOnMarket?: number
  listingAgent?: { website?: string }
  listingOffice?: { website?: string }
}

interface ListingsFetchState {
  neighborhood: string
  status: 'loading' | 'ok' | 'empty' | 'error'
  listings: RentListing[]
}

export default function AiMatch() {
  const [description, setDescription] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listingsState, setListingsState] = useState<ListingsFetchState | null>(null)
  const responseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (responseRef.current && response) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [response])

  // After streaming completes, fetch listings for the top matched neighborhood
  useEffect(() => {
    if (loading || !response) return

    const names = parseNeighborhoodNames(response)
    if (names.length === 0) return

    // Try each parsed name until one matches a known neighborhood
    let coords: { lat: number; lng: number } | null = null
    let matchedName = ''
    for (const name of names) {
      const c = findNeighborhoodCoords(name)
      if (c) { coords = c; matchedName = name; break }
    }
    if (!coords) return

    setListingsState({ neighborhood: matchedName, status: 'loading', listings: [] })

    fetch(`/api/rentcast?mode=listings&lat=${coords.lat}&lng=${coords.lng}&radius=2`)
      .then(r => r.json())
      .then((data: RentListing[] | { error?: string }) => {
        if (!Array.isArray(data) || data.length === 0) {
          setListingsState(s => s ? { ...s, status: 'empty' } : s)
          return
        }
        setListingsState(s => s ? { ...s, status: 'ok', listings: data.slice(0, 5) } : s)
      })
      .catch(() => {
        setListingsState(s => s ? { ...s, status: 'error' } : s)
      })
  }, [loading, response])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || loading) return

    setLoading(true)
    setResponse('')
    setError(null)
    setListingsState(null)

    try {
      const res = await fetch('/api/ai-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Something went wrong')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let done = false
      while (!done) {
        const { value, done: streamDone } = await reader.read()
        done = streamDone
        if (value) {
          setResponse(prev => prev + decoder.decode(value, { stream: !done }))
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setDescription('')
    setResponse('')
    setError(null)
    setListingsState(null)
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: '#f97316' }} />
          <h2 className="text-white font-bold">Describe your ideal neighborhood</h2>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#a0a0a0' }}>
          Tell us what matters to you — air quality, green space, safety, schools,
          walkability, budget, anything — in your own words. Our AI will match your
          description against real Columbus data and find your best-fit neighborhoods.
        </p>
      </div>

      {/* Example prompts */}
      {!response && !loading && (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#3a3a3a' }}>
              Try an example
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLE_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setDescription(p)}
                  className="text-left px-4 py-3 rounded-xl text-xs leading-relaxed transition-all"
                  style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a', color: '#a0a0a0' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#f9731666')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                >
                  &ldquo;{p}&rdquo;
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: '#2a2a2a' }} />
            <span className="text-xs" style={{ color: '#3a3a3a' }}>or write your own</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#2a2a2a' }} />
          </div>
        </>
      )}

      {/* Streaming result */}
      {response && (
        <div
          ref={responseRef}
          className="rounded-2xl p-6"
          style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={13} style={{ color: '#f97316' }} />
            <span className="text-xs font-semibold" style={{ color: '#f97316' }}>
              AI Match Results
            </span>
          </div>
          <div
            className="text-sm leading-relaxed"
            style={{ color: '#a0a0a0' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(response) }}
          />

          {!loading && (
            <>
              <div className="mt-6 pt-4" style={{ borderTop: '1px solid #2a2a2a' }}>
                <div className="flex items-start gap-2">
                  <Database size={12} className="mt-0.5 shrink-0" style={{ color: '#3a3a3a' }} />
                  <p className="text-xs leading-relaxed" style={{ color: '#3a3a3a' }}>
                    Matches are calculated using the same real data shown throughout Liveability —
                    walkability, air quality, safety, transit, green space, and more. This is not a
                    black-box guess; it&apos;s the AI applying your preferences to verified neighborhood metrics.
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                className="mt-4 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: '#1a1a1a', color: '#a0a0a0', border: '1px solid #2a2a2a' }}
              >
                <RotateCcw size={11} />
                Start over
              </button>
            </>
          )}
        </div>
      )}

      {/* Property listings from Rentcast */}
      {!loading && listingsState && listingsState.status !== 'error' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Home size={14} style={{ color: '#f97316' }} />
            <span className="text-sm font-semibold text-white">
              Active listings near {listingsState.neighborhood}
            </span>
            <span className="text-xs" style={{ color: '#3a3a3a' }}>via Rentcast</span>
          </div>

          {listingsState.status === 'loading' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                  <div className="h-4 w-24 rounded mb-3" style={{ backgroundColor: '#2a2a2a' }} />
                  <div className="h-6 w-16 rounded" style={{ backgroundColor: '#2a2a2a' }} />
                </div>
              ))}
            </div>
          )}

          {listingsState.status === 'ok' && listingsState.listings.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {listingsState.listings.map(listing => {
                const agentSite = listing.listingAgent?.website ?? listing.listingOffice?.website ?? null
                return (
                  <div
                    key={listing.id}
                    className="rounded-xl p-4 flex flex-col gap-2"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                  >
                    <p className="text-xs leading-snug text-white font-medium">{listing.formattedAddress}</p>
                    <p className="text-xl font-bold" style={{ color: '#f97316' }}>
                      ${listing.price.toLocaleString()}<span className="text-sm font-normal" style={{ color: '#a0a0a0' }}>/mo</span>
                    </p>
                    <p className="text-xs" style={{ color: '#a0a0a0' }}>
                      {[
                        listing.propertyType,
                        listing.bedrooms != null ? `${listing.bedrooms} bd` : null,
                        listing.bathrooms != null ? `${listing.bathrooms} ba` : null,
                        listing.squareFootage ? `${listing.squareFootage.toLocaleString()} sqft` : null,
                        listing.daysOnMarket != null ? `${listing.daysOnMarket}d on market` : null,
                      ].filter(Boolean).join(' · ')}
                    </p>
                    {agentSite && (
                      <a
                        href={agentSite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs transition-colors"
                        style={{ color: '#f97316' }}
                      >
                        View listing <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {listingsState.status === 'empty' && (
            <p className="text-xs" style={{ color: '#3a3a3a' }}>
              No active listings found near {listingsState.neighborhood} right now — Rentcast coverage varies by area.
            </p>
          )}
        </div>
      )}

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: '#ef44441a', border: '1px solid #ef444444', color: '#ef4444' }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. I want excellent green space, good air quality, and to be near a hospital"
          rows={4}
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-[#f97316] resize-none disabled:opacity-50"
          style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#3a3a3a' }}>
            {description.length}/1000
          </span>
          <button
            type="submit"
            disabled={!description.trim() || loading || description.length > 1000}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#f97316' }}
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Send size={13} />
                Find my match
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
