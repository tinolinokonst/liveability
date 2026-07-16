"use client"

import { useState, useEffect, useRef } from 'react'
import { Sparkles, Send, RotateCcw, Database, Home, ExternalLink, ArrowRight, Loader2 } from 'lucide-react'
import { MATCHABLE_AREAS, areaDisplayName } from '@/lib/neighborhoods'
import { AiMatchListingsState, AiRentListing } from '@/lib/types'

export type { AiMatchListingsState, AiRentListing }

const STATUS_MESSAGES = [
  'Analyzing your preferences...',
  'Matching against Swiss data...',
  'Generating recommendations...',
]

const EXAMPLE_PROMPTS = [
  "I work from home and want a quiet area with good coffee shops and parks within walking distance. Budget around CHF 1,800/month.",
  "Young professional commuting to the office, love restaurants and nightlife, don't have a car so transit is essential. Can spend up to CHF 2,500.",
  "Family with two kids, safety and good schools are the top priority. We need a grocery store nearby and prefer a quieter area. Budget CHF 1,600.",
  "Retired couple looking for clean air, green spaces, and easy access to healthcare. Prefer quiet streets and walkable amenities.",
]

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-white mt-5 mb-1.5">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-black mt-6 mb-2" style="color:#f97316">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc" style="color:#a0a0a0">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

function parseNeighborhoodNames(text: string): string[] {
  const matches = [...text.matchAll(/^###\s+\d+\.\s+(.+)$/gm)]
  return matches.map(m => m[1].trim()).filter(Boolean)
}

function findNeighborhoodCoords(name: string): { lat: number; lng: number } | null {
  const lower = name.toLowerCase()
  // Collect all fuzzy matches and prefer the longest name, so a heading like
  // "Breitenrain/Lorraine, Bern" never resolves to Basel's shorter "Breite"
  const candidates = MATCHABLE_AREAS.filter(n => {
    const short = n.name.toLowerCase()
    const full = areaDisplayName(n).toLowerCase()
    return (
      short === lower || full === lower ||
      lower.includes(short) || full.includes(lower)
    )
  })
  if (candidates.length === 0) return null
  const match = candidates.reduce((a, b) => (b.name.length > a.name.length ? b : a))
  return { lat: match.lat, lng: match.lng }
}

function neighborhoodExists(name: string): boolean {
  return findNeighborhoodCoords(name) !== null
}

interface AiMatchProps {
  description: string
  response: string
  listingsState: AiMatchListingsState | null
  onDescriptionChange: (v: string) => void
  onResponseChange: (v: string) => void
  onListingsChange: (v: AiMatchListingsState | null) => void
  onViewNeighborhood: (name: string) => void
  onViewAddress: (address: string) => void
}

export default function AiMatch({
  description,
  response,
  listingsState,
  onDescriptionChange,
  onResponseChange,
  onListingsChange,
  onViewNeighborhood,
  onViewAddress,
}: AiMatchProps) {
  const [loading, setLoading] = useState(false)
  const [statusIdx, setStatusIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const responseRef = useRef<HTMLDivElement>(null)
  const listingsFetchedRef = useRef(false)

  // Cycle status messages while loading
  useEffect(() => {
    if (!loading) { setStatusIdx(0); return }
    const id = setInterval(() => setStatusIdx(prev => (prev + 1) % STATUS_MESSAGES.length), 2500)
    return () => clearInterval(id)
  }, [loading])

  // Reset the listings-fetched guard whenever response is cleared
  useEffect(() => {
    if (!response) listingsFetchedRef.current = false
  }, [response])

  // Scroll response into view as it streams in
  useEffect(() => {
    if (responseRef.current && response) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [response])

  // After streaming completes, fetch listings for the top matched neighborhood
  useEffect(() => {
    if (loading || !response || listingsState !== null || listingsFetchedRef.current) return

    const names = parseNeighborhoodNames(response)
    if (names.length === 0) return

    let coords: { lat: number; lng: number } | null = null
    let matchedName = ''
    for (const name of names) {
      const c = findNeighborhoodCoords(name)
      if (c) { coords = c; matchedName = name; break }
    }
    if (!coords) return

    listingsFetchedRef.current = true
    onListingsChange({ neighborhood: matchedName, status: 'loading', listings: [] })

    fetch(`/api/rentcast?mode=listings&lat=${coords.lat}&lng=${coords.lng}&radius=2`)
      .then(r => r.json())
      .then((data: AiRentListing[] | { error?: string }) => {
        if (!Array.isArray(data) || data.length === 0) {
          onListingsChange({ neighborhood: matchedName, status: 'empty', listings: [] })
          return
        }
        onListingsChange({ neighborhood: matchedName, status: 'ok', listings: data.slice(0, 5) })
      })
      .catch(() => {
        onListingsChange({ neighborhood: matchedName, status: 'error', listings: [] })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, response, listingsState])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || loading) return

    setLoading(true)
    onResponseChange('')
    setError(null)
    onListingsChange(null)
    listingsFetchedRef.current = false

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
      let accumulated = ''
      while (!done) {
        const { value, done: streamDone } = await reader.read()
        done = streamDone
        if (value) {
          accumulated += decoder.decode(value, { stream: !done })
          onResponseChange(accumulated)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    onDescriptionChange('')
    onResponseChange('')
    setError(null)
    onListingsChange(null)
    listingsFetchedRef.current = false
  }

  const parsedNeighborhoods = response ? parseNeighborhoodNames(response) : []
  const knownNeighborhoods = parsedNeighborhoods.filter(neighborhoodExists)

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: '#f97316' }} />
          <h2 className="text-white font-bold">Describe your ideal area</h2>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#a0a0a0' }}>
          Tell us what matters to you — air quality, green space, safety, schools,
          walkability, budget, anything — in your own words. Our AI will match your
          description against real Swiss data and find your best-fit areas.
        </p>
      </div>

      {/* Example prompts — only shown before results */}
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
                  onClick={() => onDescriptionChange(p)}
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

      {/* Loading indicator — shown before first streaming chunk arrives */}
      {loading && !response && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Loader2 size={28} className="animate-spin" style={{ color: '#f97316' }} />
          <p className="text-sm font-medium transition-opacity" style={{ color: '#a0a0a0' }}>
            {STATUS_MESSAGES[statusIdx]}
          </p>
        </div>
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
              {/* Neighborhood navigation buttons */}
              {knownNeighborhoods.length > 0 && (
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid #2a2a2a' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#a0a0a0' }}>
                    View full details
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {knownNeighborhoods.map(name => (
                      <button
                        key={name}
                        onClick={() => onViewNeighborhood(name)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{ backgroundColor: '#1a1a1a', color: '#f97316', border: '1px solid #f9731633' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = '#f973161a'
                          e.currentTarget.style.borderColor = '#f9731666'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = '#1a1a1a'
                          e.currentTarget.style.borderColor = '#f9731633'
                        }}
                      >
                        {name} <ArrowRight size={11} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Data attribution */}
              <div className="mt-5 pt-4" style={{ borderTop: '1px solid #2a2a2a' }}>
                <div className="flex items-start gap-2">
                  <Database size={12} className="mt-0.5 shrink-0" style={{ color: '#3a3a3a' }} />
                  <p className="text-xs leading-relaxed" style={{ color: '#3a3a3a' }}>
                    Matches are calculated using the same real data shown throughout Liveability —
                    walkability, air quality, safety, transit, green space, and more. This is not a
                    black-box guess; it&apos;s the AI applying your preferences to verified city metrics.
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
                      CHF {listing.price.toLocaleString()}
                      <span className="text-sm font-normal" style={{ color: '#a0a0a0' }}>/mo</span>
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
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <button
                        onClick={() => onViewAddress(listing.formattedAddress)}
                        className="flex items-center gap-1 text-xs font-semibold transition-colors"
                        style={{ color: '#f97316' }}
                      >
                        Search this address <ArrowRight size={10} />
                      </button>
                      {agentSite && (
                        <a
                          href={agentSite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs transition-colors"
                          style={{ color: '#a0a0a0' }}
                        >
                          Agent site <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {listingsState.status === 'empty' && (
            <p className="text-xs" style={{ color: '#3a3a3a' }}>
              Live rental listings aren&apos;t available for Switzerland yet — use the average rent
              shown in each city&apos;s details as a guide.
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
          onChange={e => onDescriptionChange(e.target.value)}
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
