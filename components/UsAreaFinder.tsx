"use client"

import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, MapPin, Search } from 'lucide-react'
import UsResults from './UsResults'
import { panelMotion, ViewSwap } from './motion'
import { loadGoogleMapsScript } from '@/lib/googleMaps'
import { geocodeAddress } from '@/lib/geocoding'
import { predictionInState, US_STATES, usStateByAbbr, type UsState } from '@/lib/usStates'
import { US_AREA_REFS } from '@/lib/usAreaIndex'
import type { GeoLocation } from '@/lib/types'

const DEBOUNCE_MS = 250
const MAX_SUGGESTIONS = 6

interface Suggestion { id: string; main: string; secondary: string; description: string }
interface OpenArea { label: string; location: GeoLocation }

const fieldStyle = { backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }

/**
 * The US side of the Areas tab: pick a state, then a city, town, neighborhood
 * or ZIP code in it, and see that area in the US results view (the same one a
 * US address gets). Suggestions come from Google Places, filtered to the
 * chosen state; the pick is then geocoded and its Census state checked, so an
 * area can only open if it really lies in that state.
 */
export default function UsAreaFinder() {
  const [stateAbbr, setStateAbbr] = useState('')
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [area, setArea] = useState<OpenArea | null>(null)
  const reduce = useReducedMotion()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionToken = useRef<any>(null)
  const requestId = useRef(0)

  const state = usStateByAbbr(stateAbbr)
  const profiled = state ? US_AREA_REFS.filter(a => a.state === state.abbr) : []

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => { service.current ??= new window.google.maps.places.AutocompleteService() })
      .catch(err => console.log('Google Maps script failed to load:', err))
  }, [])

  // Suggestions for the typed text, within the chosen state. The state's name
  // goes into the query so Google looks there first; predictions elsewhere are
  // then dropped. A newer keystroke supersedes an older answer.
  useEffect(() => {
    const text = query.trim()
    if (!state || text.length < 2) { setSuggestions([]); return }
    const id = ++requestId.current
    const timer = setTimeout(() => {
      const google = window.google
      if (!service.current || !google) return
      sessionToken.current ??= new google.maps.places.AutocompleteSessionToken()
      service.current.getPlacePredictions(
        { input: `${text}, ${state.name}`, types: ['(regions)'], componentRestrictions: { country: 'us' }, sessionToken: sessionToken.current },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (predictions: any[] | null) => {
          if (id !== requestId.current) return
          const inState = (predictions ?? [])
            .filter(p => predictionInState((p.terms ?? []).map((t: { value: string }) => t.value), state))
            .slice(0, MAX_SUGGESTIONS)
            .map(p => ({
              id: p.place_id,
              main: p.structured_formatting?.main_text ?? p.description,
              secondary: p.structured_formatting?.secondary_text ?? '',
              description: p.description,
            }))
          setSuggestions(inState)
          setActive(inState.length ? 0 : -1)
        }
      )
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, state])

  function chooseState(abbr: string) {
    setStateAbbr(abbr)
    setQuery('')
    setSuggestions([])
    setError(null)
    // Straight on to the second step
    if (abbr) requestAnimationFrame(() => inputRef.current?.focus())
  }

  async function openArea(label: string, address: string, s: UsState) {
    setOpen(false)
    setOpening(true)
    setError(null)
    sessionToken.current = null
    try {
      const location = await geocodeAddress(address)
      if (!location || location.country !== 'US') {
        setError(`We couldn't find that place in ${s.name}. Try another name or a ZIP code.`)
        return
      }
      // The Census state is the authority: an area must lie in the chosen state
      const actual = location.us?.stateAbbr
      if (actual && actual !== s.abbr) {
        setError(`That place is in ${usStateByAbbr(actual)?.name ?? actual}, not ${s.name}. Pick one in ${s.name}, or switch the state.`)
        return
      }
      setArea({ label, location })
    } catch {
      setError('Search is temporarily unavailable. Please try again.')
    } finally {
      setOpening(false)
    }
  }

  function pick(sugg: Suggestion) {
    if (!state) return
    setQuery(sugg.main)
    openArea(sugg.secondary ? `${sugg.main}, ${sugg.secondary.replace(/, USA$/, '')}` : sugg.main, sugg.description, state)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && suggestions.length) { e.preventDefault(); setOpen(true); setActive(i => (i + 1) % suggestions.length) }
    else if (e.key === 'ArrowUp' && suggestions.length) { e.preventDefault(); setOpen(true); setActive(i => (i <= 0 ? suggestions.length - 1 : i - 1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && suggestions[active]) pick(suggestions[active])
      else if (state && query.trim()) openArea(query.trim(), `${query.trim()}, ${state.name}, USA`, state)
    } else if (e.key === 'Escape') setOpen(false)
  }

  const showList = open && suggestions.length > 0

  return (
    <ViewSwap viewKey={area ? `area:${area.location.lat},${area.location.lng}` : 'search'} depth={area ? 1 : 0}>
      {area ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setArea(null)}
              className="text-xs transition-colors flex items-center gap-1"
              style={{ color: '#a0a0a0' }}
            >
              <ArrowLeft size={14} /> Back to area search
            </button>
            <span className="text-sm font-semibold text-white">{area.label}</span>
          </div>
          <UsResults location={area.location} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: '#a0a0a0' }}>1. State</span>
              <select
                value={stateAbbr}
                onChange={e => chooseState(e.target.value)}
                className="h-12 px-3 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-[#f97316]"
                style={{ ...fieldStyle, color: stateAbbr ? 'white' : '#a0a0a0' }}
              >
                <option value="">Choose a state</option>
                {US_STATES.map(s => <option key={s.abbr} value={s.abbr}>{s.name}</option>)}
              </select>
            </label>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${listId}-input`} className="text-xs font-medium" style={{ color: state ? '#a0a0a0' : '#6b6b6b' }}>
                2. Area{state ? ` in ${state.name}` : ''}
              </label>
              <div className="relative">
                <div className="flex items-center rounded-xl px-3 focus-within:ring-2 focus-within:ring-[#f97316]" style={{ ...fieldStyle, opacity: state ? 1 : 0.5 }}>
                  <Search size={15} className="shrink-0" style={{ color: '#6b6b6b' }} />
                  <input
                    ref={inputRef}
                    id={`${listId}-input`}
                    type="text"
                    role="combobox"
                    aria-expanded={showList}
                    aria-controls={`${listId}-list`}
                    aria-autocomplete="list"
                    aria-activedescendant={showList && active >= 0 ? `${listId}-opt-${active}` : undefined}
                    autoComplete="off"
                    disabled={!state || opening}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); setError(null) }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    onKeyDown={onKeyDown}
                    placeholder={state ? 'City, town, neighborhood or ZIP code' : 'Choose a state first'}
                    className="flex-1 min-w-0 bg-transparent px-2 h-12 text-base sm:text-sm text-white outline-none placeholder-[#6b6b6b] disabled:cursor-not-allowed"
                  />
                </div>

                <AnimatePresence>
                  {showList && (
                    <motion.ul
                      key="list"
                      id={`${listId}-list`}
                      role="listbox"
                      className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20 origin-top"
                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
                      {...panelMotion(reduce)}
                    >
                      {suggestions.map((s, i) => (
                        <li
                          key={s.id}
                          id={`${listId}-opt-${i}`}
                          role="option"
                          aria-selected={i === active}
                          // mousedown, not click: it fires before the input's blur closes the list
                          onMouseDown={e => { e.preventDefault(); pick(s) }}
                          onMouseEnter={() => setActive(i)}
                          className="px-4 py-2.5 cursor-pointer flex items-center gap-2.5"
                          style={{ backgroundColor: i === active ? '#2a2a2a' : 'transparent' }}
                        >
                          <MapPin size={13} className="shrink-0" style={{ color: '#f97316' }} />
                          <span className="min-w-0">
                            <span className="text-sm text-white">{s.main}</span>
                            {s.secondary && <span className="text-xs ml-1.5" style={{ color: '#6b6b6b' }}>{s.secondary.replace(/, USA$/, '')}</span>}
                          </span>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {opening && <p className="text-sm" style={{ color: '#a0a0a0' }} role="status">Opening area…</p>}

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: '#ef44441a', color: '#ef4444', border: '1px solid #ef444433' }} role="alert">
              {error}
            </div>
          )}

          {state && profiled.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs" style={{ color: '#6b6b6b' }}>Or start with an area we&apos;ve profiled in {state.name}:</p>
              <div className="flex flex-wrap gap-2">
                {profiled.map(a => (
                  <button
                    key={a.name}
                    type="button"
                    disabled={opening}
                    onClick={() => openArea(a.name, a.address, state)}
                    className="text-xs px-3 py-1.5 rounded-full transition-colors hover:border-[#f97316] disabled:opacity-50"
                    style={{ color: '#e0e0e0', backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!state && (
            <p className="text-xs" style={{ color: '#6b6b6b' }}>
              Every US area gets the same data as a US address: Liveability Score, budget, schools, transit, safety,
              air quality, flood and other risks.
            </p>
          )}
        </div>
      )}
    </ViewSwap>
  )
}
