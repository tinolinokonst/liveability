"use client"

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { geocodeAddress } from '@/lib/geocoding'
import { capture } from '@/lib/analytics'
import { useFeatureFlags } from './FeatureFlags'
import { buildMetrics } from '@/lib/metrics'
import { AQIResult } from '@/lib/airquality'
import { countryOf } from '@/lib/country'
import { providersFor } from '@/lib/providers'
import { loadGoogleMapsScript } from '@/lib/googleMaps'
import { saveAddress } from '@/lib/savedAddresses'
import { AddressMetrics, AmenityScores, CrimeResult, GeoLocation } from '@/lib/types'
import AddressResults from './AddressResults'
import CoverageComingSoon from './CoverageComingSoon'
import ResultsHeader from './ResultsHeader'

interface AddressSearchProps {
  onAdd?: (metrics: AddressMetrics) => void
  compareCount?: number
  userId?: string | null
  initialAddress?: string | null
  onBack?: () => void
}

const RADIUS_OPTIONS: Array<{ label: string; meters: number }> = [
  { label: '400m', meters: 400 },
  { label: '800m', meters: 800 },
  { label: '1.6km', meters: 1600 },
  { label: '3km', meters: 3000 },
]

function isValidAddress(addr: string, allowUs = false): boolean {
  const trimmed = addr.trim()
  if (trimmed.length < 8) return false
  if (!/\d+/.test(trimmed)) return false
  // Swiss addresses put the house number after the street ("Bahnhofstrasse 1"),
  // so require a street word followed by a number (unicode letters for ü/é/etc.)
  if (/[A-Za-zÀ-ÖØ-öø-ÿ]{3,}\.?\s*\d+/.test(trimmed)) return true
  // US addresses lead with the number ("350 5th Ave", "1600 Pennsylvania Ave"),
  // often with a one-letter direction before the street ("200 W Washington St")
  return allowUs && /^\d+[A-Za-z]?\s+(?:[NSEW]\.?\s+)?\S{2,}/i.test(trimmed)
}

export default function AddressSearch({ onAdd, compareCount = 0, userId, initialAddress, onBack }: AddressSearchProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [radiusLoading, setRadiusLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState(false)
  const [result, setResult] = useState<AddressMetrics | null>(null)
  const [amenityData, setAmenityData] = useState<AmenityScores | null>(null)
  const [aqiData, setAqiData] = useState<AQIResult | null>(null)
  const [crimeData, setCrimeData] = useState<CrimeResult | null>(null)
  // Resolved, but in a country whose metrics aren't all available yet (US, for now)
  const [unscored, setUnscored] = useState<GeoLocation | null>(null)
  const [radius, setRadius] = useState(800)
  const flags = useFeatureFlags()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteSelectedRef = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null)

  // Wire up Google Places Autocomplete on the address input
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let listener: any
    let cancelled = false

    loadGoogleMapsScript()
      .then(() => {
        // A setup run that was already cleaned up must not attach anything:
        // React runs effects twice in development, and a second
        // place_changed listener would run every selected search twice
        if (cancelled || !inputRef.current || !window.google) return

        // Autocomplete has no destroy(), so create it once per input and
        // reuse it. A second instance on the same input doubles every
        // Places request (billed) and stacks two suggestion lists.
        autocompleteRef.current ??= new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry', 'name'],
          // Places allows up to five countries; US only while US_ENABLED is on
          componentRestrictions: { country: flags.us ? ['ch', 'us'] : 'ch' },
        })
        const autocomplete = autocompleteRef.current

        listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete!.getPlace()
          // A real autocomplete selection always has formatted_address.
          // If only place.name is set, the user pressed Enter without selecting
          // from the dropdown — treat that as manual input and validate normally.
          const isRealSelection = !!place.formatted_address
          const address = place.formatted_address || place.name
          if (address) {
            autocompleteSelectedRef.current = isRealSelection
            setQuery(address)
            runSearch(address, isRealSelection)
          }
        })
      })
      .catch(err => console.log('Google Maps script failed to load:', err))

    return () => {
      cancelled = true
      listener?.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-search when navigated from AI Match with a pre-filled address
  useEffect(() => {
    if (!initialAddress) return
    setQuery(initialAddress)
    runSearch(initialAddress, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAddress])

  // The query itself is never sent to analytics
  function failValidation() {
    setValidationError(true)
    capture('search_validation_failed')
  }

  async function runSearch(address: string, bypass = false) {
    const trimmed = address.trim()
    if (!trimmed) return
    if (!bypass && !isValidAddress(trimmed, flags.us)) {
      failValidation()
      return
    }

    setValidationError(false)
    setLoading(true)
    setError(null)
    setResult(null)
    setUnscored(null)
    setSaved(false)

    try {
      const location = await geocodeAddress(address.trim())
      if (!location) {
        setError(flags.us
          ? 'Address not found. Try a more specific Swiss or US address.'
          : 'Address not found. Try a more specific Swiss address.')
        return
      }

      // Each metric comes from the address's country's provider (lib/providers.ts)
      const providers = providersFor(countryOf(location))
      if (!providers) {
        setUnscored(location)
        return
      }
      const { lat, lng } = location

      const [aqi, cityAqiResult, amenity, crime, sunlight, noise, census, nearest, transitCh, risks] = await Promise.all([
        providers.airQuality(lat, lng),
        providers.referenceAirQuality(lat, lng),
        providers.amenities(lat, lng, radius),
        providers.safety(lat, lng),
        providers.sunlight(lat, lng),
        providers.noise(lat, lng),
        providers.community(lat, lng),
        providers.nearestEssentials(lat, lng),
        providers.transit(lat, lng),
        providers.risks(lat, lng, { radon: flags.radon }),
      ])

      setAqiData(aqi)
      setAmenityData(amenity)
      setCrimeData(crime)
      const baseResult = buildMetrics(address.trim(), location, aqi, amenity, crime, sunlight, noise, census, nearest, transitCh, undefined, risks)
      setResult(cityAqiResult != null ? { ...baseResult, cityAqi: cityAqiResult.aqi, cityAqiName: cityAqiResult.name } : baseResult)
      capture('address_search_completed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const bypass = autocompleteSelectedRef.current
    if (!bypass && !isValidAddress(query, flags.us)) {
      failValidation()
      return
    }
    await runSearch(query, bypass)
  }

  // Re-query Overpass when the amenity radius changes
  useEffect(() => {
    if (!result || !aqiData || !crimeData) return
    const providers = providersFor(countryOf(result.location))
    if (!providers) return

    let cancelled = false
    setRadiusLoading(true)

    providers.amenities(result.location.lat, result.location.lng, radius)
      .then(amenity => {
        if (cancelled) return
        setAmenityData(amenity)
        setResult(prev => {
          if (!prev) return null
          const updated = buildMetrics(
            prev.address,
            prev.location,
            aqiData,
            amenity,
            crimeData,
            prev.sunlight ?? { score: null, hoursPerYear: null, available: false },
            prev.noise ?? { score: null, level: null, nearestRoad: null, available: false },
            prev.censusData ?? { medianHouseholdIncome: null, totalPopulation: null, available: false },
            prev.nearestEssentials ?? { trainStation: null, busStop: null, grocery: null, hospital: null, pharmacy: null, school: null, library: null, park: null, bank: null, dining: null, worship: null, parking: null, searchRadiusKm: 15 },
            prev.transitCh,
            prev.id,
            prev.risks
          )
          return { ...updated, cityAqi: prev.cityAqi, cityAqiName: prev.cityAqiName }
        })
      })
      .finally(() => {
        if (!cancelled) setRadiusLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius])

  function handleAdd() {
    if (result && onAdd) onAdd(result)
  }

  async function handleSave() {
    if (!result || !userId) return

    setSaving(true)
    try {
      await saveAddress(userId, result)
      setSaved(true)
      capture('address_saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {onBack && (
        <button
          onClick={onBack}
          className="text-xs flex items-center gap-1 self-start transition-colors"
          style={{ color: '#f97316' }}
        >
          <ArrowLeft size={14} /> Back to AI Match results
        </button>
      )}
      {/* Phones: full-width input, then the button row beneath it. Side by side
          at 375px left the input too narrow to show more than a few words. */}
      <form onSubmit={handleSearch} className="flex flex-wrap sm:flex-nowrap gap-3 items-start">
        <div className="basis-full sm:basis-auto sm:flex-1 min-w-0 flex flex-col gap-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setValidationError(false)
              autocompleteSelectedRef.current = false
            }}
            // Capture phase: Google's own keydown listener on this input runs
            // before a bubbling handler and clears the highlight first
            onKeyDownCapture={e => {
              // Enter on a highlighted suggestion is a selection, which Google's
              // place_changed handler searches; without this it also submitted the
              // form with the half-typed text — two searches, last one wins
              if (e.key === 'Enter' && document.querySelector('.pac-container .pac-item-selected')) e.preventDefault()
            }}
            placeholder={flags.us ? 'e.g. Bahnhofstrasse 1, Zürich or 350 5th Ave, New York' : 'e.g. Bahnhofstrasse 1, Zürich'}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[#a0a0a0] outline-none focus:ring-2 focus:ring-[#f97316] transition-all"
            style={{ backgroundColor: '#1a1a1a', border: `1px solid ${validationError ? '#ef4444' : '#2a2a2a'}` }}
          />
          {validationError && (
            <p className="text-xs px-1" style={{ color: '#ef4444' }}>
              Please enter a full street address (e.g. Bahnhofstrasse 1, 8001 Zürich{flags.us ? ' or 350 5th Ave, New York, NY' : ''})
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          onClick={(e) => {
            if (!autocompleteSelectedRef.current && !isValidAddress(query, flags.us)) {
              e.preventDefault()
              failValidation()
            }
          }}
          className="flex-1 sm:flex-none px-5 py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#f97316',
            opacity: loading ? 0.5 : (!isValidAddress(query, flags.us) && !autocompleteSelectedRef.current ? 0.65 : 1),
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
        {compareCount > 0 && (
          <div
            className="px-4 py-3 rounded-xl text-sm font-semibold flex items-center whitespace-nowrap"
            style={{ backgroundColor: '#2a2a2a', color: '#f97316', border: '1px solid #3a3a3a' }}
          >
            Compare ({compareCount})
          </div>
        )}
      </form>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm text-[#ef4444]" style={{ backgroundColor: '#ef44441a', border: '1px solid #ef444433' }}>
          {error}
        </div>
      )}

      {/* Resolved in a country that isn't fully scored yet (the US, for now) */}
      {unscored && !loading && <CoverageComingSoon location={unscored} />}

      {loading && (
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="h-3 w-16 rounded" style={{ backgroundColor: '#2a2a2a' }} />
              <div className="h-4 w-56 rounded" style={{ backgroundColor: '#2a2a2a' }} />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded" style={{ backgroundColor: '#2a2a2a' }} />
              <div className="h-9 w-28 rounded-lg" style={{ backgroundColor: '#2a2a2a' }} />
            </div>
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

      {result && amenityData && (
        <div className="flex flex-col gap-4">
          {/* The headline score lives in the Liveability Score card directly
              below; repeating it here just gave the reader two numbers to
              reconcile. */}
          <ResultsHeader
            title={result.location.formattedAddress}
            actions={<>
              {userId && (
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                  style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
                >
                  {saved ? <>Saved <Check size={14} /></> : saving ? 'Saving...' : 'Save this address'}
                </button>
              )}
              {onAdd && compareCount < 3 && (
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
                >
                  + Add to comparison
                </button>
              )}
            </>}
          />

          {/* Amenity radius selector */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span style={{ color: '#a0a0a0' }} className="text-xs font-medium uppercase tracking-wider">
              Amenity radius
            </span>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map(opt => (
                <button
                  key={opt.meters}
                  onClick={() => {
                    if (opt.meters === radius) return
                    setRadius(opt.meters)
                    capture('radius_changed', { radius: opt.meters })
                  }}
                  disabled={radiusLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: radius === opt.meters ? '#f97316' : '#2a2a2a',
                    color: radius === opt.meters ? 'white' : '#a0a0a0',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {radiusLoading && <span style={{ color: '#a0a0a0' }} className="text-xs">Updating...</span>}
          </div>

          <AddressResults metrics={result} />
        </div>
      )}
    </div>
  )
}
