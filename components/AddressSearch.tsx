"use client"

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { geocodeAddress } from '@/lib/geocoding'
import { fetchAmenityScores } from '@/lib/overpass'
import { buildMetrics } from '@/lib/metrics'
import { fetchAQI, AQIResult } from '@/lib/airquality'
import { fetchCrimeScore } from '@/lib/crime'
import { fetchSunlight } from '@/lib/sunlight'
import { fetchNoiseEstimate } from '@/lib/noise'
import { fetchCensus } from '@/lib/census'
import { fetchFBICrime } from '@/lib/fbi-crime'
import { fetchNearestEssentials } from '@/lib/nearest'
import { loadGoogleMapsScript } from '@/lib/googleMaps'
import { saveAddress } from '@/lib/savedAddresses'
import { AddressMetrics, AmenityScores, CrimeResult } from '@/lib/types'
import AddressResults from './AddressResults'

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

const COLUMBUS_CENTER = { lat: 39.9612, lng: -82.9988 }
const COLUMBUS_BIAS_RADIUS_M = 40000

function isValidAddress(addr: string): boolean {
  const trimmed = addr.trim()
  if (trimmed.length < 10) return false
  if (!/\d+/.test(trimmed)) return false
  if (!/\d+\s+[a-zA-Z]{3,}/.test(trimmed)) return false
  return true
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
  const [radius, setRadius] = useState(800)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteSelectedRef = useRef(false)

  // Wire up Google Places Autocomplete on the address input
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let autocomplete: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let listener: any

    loadGoogleMapsScript()
      .then(() => {
        if (!inputRef.current || !window.google) return

        const center = new window.google.maps.LatLng(COLUMBUS_CENTER.lat, COLUMBUS_CENTER.lng)
        const circle = new window.google.maps.Circle({ center, radius: COLUMBUS_BIAS_RADIUS_M })

        autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry', 'name'],
          componentRestrictions: { country: 'us' },
        })
        autocomplete.setBounds(circle.getBounds())

        listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete!.getPlace()
          const address = place.formatted_address || place.name
          if (address) {
            autocompleteSelectedRef.current = true
            setValidationError(false)
            setQuery(address)
            runSearch(address)
          }
        })
      })
      .catch(err => console.log('Google Maps script failed to load:', err))

    return () => {
      listener?.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-search when navigated from AI Match with a pre-filled address
  useEffect(() => {
    if (!initialAddress) return
    setQuery(initialAddress)
    runSearch(initialAddress)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAddress])

  async function runSearch(address: string) {
    if (!address.trim()) return

    setLoading(true)
    setError(null)
    setValidationError(false)
    setResult(null)
    setSaved(false)

    try {
      const location = await geocodeAddress(address.trim())
      if (!location) {
        setError('Address not found. Try a more specific Columbus, OH address.')
        return
      }

      const [aqi, columbusAqiResult, amenity, crime, sunlight, noise, census, fbiCrime, nearest] = await Promise.all([
        fetchAQI(location.lat, location.lng),
        fetchAQI(COLUMBUS_CENTER.lat, COLUMBUS_CENTER.lng).catch(() => null),
        fetchAmenityScores(location.lat, location.lng, radius),
        fetchCrimeScore(location.lat, location.lng),
        fetchSunlight(location.lat, location.lng),
        fetchNoiseEstimate(location.lat, location.lng),
        fetchCensus(location.lat, location.lng),
        fetchFBICrime(),
        fetchNearestEssentials(location.lat, location.lng),
      ])

      setAqiData(aqi)
      setAmenityData(amenity)
      setCrimeData(crime)
      setFetchedAt(new Date())
      const baseResult = buildMetrics(address.trim(), location, aqi, amenity, crime, sunlight, noise, census, fbiCrime, nearest)
      setResult(columbusAqiResult != null ? { ...baseResult, columbusAqi: columbusAqiResult.aqi } : baseResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!autocompleteSelectedRef.current && !isValidAddress(query)) {
      setValidationError(true)
      return
    }
    setValidationError(false)
    await runSearch(query)
  }

  // Re-query Overpass when the amenity radius changes
  useEffect(() => {
    if (!result || !aqiData || !crimeData) return

    let cancelled = false
    setRadiusLoading(true)

    fetchAmenityScores(result.location.lat, result.location.lng, radius)
      .then(amenity => {
        if (cancelled) return
        setAmenityData(amenity)
        setFetchedAt(new Date())
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
            prev.censusData ?? prev.demographics ?? { medianHouseholdIncome: null, totalPopulation: null, available: false },
            prev.fbiCrime ?? { agencyName: null, violentCrimeRate: null, propertyCrimeRate: null, year: null, available: false },
            prev.nearestEssentials ?? { trainStation: null, busStop: null, grocery: null, hospital: null, pharmacy: null, school: null, library: null, park: null, bank: null, dining: null, worship: null, parking: null, searchRadiusKm: 15 },
            prev.id
          )
          return { ...updated, columbusAqi: prev.columbusAqi }
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  const updatedLabel = fetchedAt
    ? `Updated ${Math.max(0, Math.round((Date.now() - fetchedAt.getTime()) / 1000)) < 60 ? 'just now' : 'recently'}`
    : undefined

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
      <form onSubmit={handleSearch} className="flex gap-3 items-start">
        <div className="flex-1 flex flex-col gap-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setValidationError(false)
              autocompleteSelectedRef.current = false
            }}
            placeholder="Enter a Columbus, OH address..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[#a0a0a0] outline-none focus:ring-2 focus:ring-[#f97316] transition-all"
            style={{ backgroundColor: '#1a1a1a', border: `1px solid ${validationError ? '#ef4444' : '#2a2a2a'}` }}
          />
          {validationError && (
            <p className="text-xs px-1" style={{ color: '#ef4444' }}>
              Please enter a full street address (e.g. 3101 Leeds Rd, Columbus, OH)
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          onClick={(e) => {
            if (!autocompleteSelectedRef.current && !isValidAddress(query)) {
              e.preventDefault()
              setValidationError(true)
            }
          }}
          className="px-5 py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#f97316',
            opacity: loading ? 0.5 : (!isValidAddress(query) && !autocompleteSelectedRef.current ? 0.65 : 1),
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
        {compareCount > 0 && (
          <div
            className="px-4 py-3 rounded-xl text-sm font-semibold flex items-center"
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <p style={{ color: '#a0a0a0' }} className="text-xs mb-1">Results for</p>
              <p className="text-white font-semibold text-sm">{result.location.formattedAddress}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p style={{ color: '#a0a0a0' }} className="text-xs">Overall</p>
                <p className="text-2xl font-bold" style={{ color: '#f97316' }}>{result.overallScore}</p>
              </div>
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
            </div>
          </div>

          {/* Amenity radius selector */}
          <div className="flex items-center gap-3">
            <span style={{ color: '#a0a0a0' }} className="text-xs font-medium uppercase tracking-wider">
              Amenity radius
            </span>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map(opt => (
                <button
                  key={opt.meters}
                  onClick={() => setRadius(opt.meters)}
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

          <AddressResults metrics={result} updated={updatedLabel} />
        </div>
      )}
    </div>
  )
}
