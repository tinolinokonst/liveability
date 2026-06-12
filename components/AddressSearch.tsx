"use client"

import { useState, useEffect, useRef } from 'react'
import { geocodeAddress } from '@/lib/geocoding'
import { fetchAmenityScores } from '@/lib/overpass'
import { buildMetrics } from '@/lib/metrics'
import { fetchAQI, AQIResult } from '@/lib/airquality'
import { fetchCrimeScore } from '@/lib/crime'
import { loadGoogleMapsScript } from '@/lib/googleMaps'
import { saveAddress } from '@/lib/savedAddresses'
import { AddressMetrics, AmenityScores, CrimeResult } from '@/lib/types'
import MetricCard from './MetricCard'
import LocalNews from './LocalNews'

interface AddressSearchProps {
  onAdd?: (metrics: AddressMetrics) => void
  compareCount?: number
  userId?: string | null
}

const RADIUS_OPTIONS: Array<{ label: string; meters: number }> = [
  { label: '400m', meters: 400 },
  { label: '800m', meters: 800 },
  { label: '1.6km', meters: 1600 },
  { label: '3km', meters: 3000 },
]

const COLUMBUS_CENTER = { lat: 39.9612, lng: -82.9988 }
const COLUMBUS_BIAS_RADIUS_M = 40000

function nearestLabel(nearest: { name: string; distanceKm: number } | null): string | undefined {
  if (!nearest) return undefined
  return `Nearest: ${nearest.name} — ${nearest.distanceKm}km`
}

export default function AddressSearch({ onAdd, compareCount = 0, userId }: AddressSearchProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [radiusLoading, setRadiusLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AddressMetrics | null>(null)
  const [amenityData, setAmenityData] = useState<AmenityScores | null>(null)
  const [aqiData, setAqiData] = useState<AQIResult | null>(null)
  const [crimeData, setCrimeData] = useState<CrimeResult | null>(null)
  const [radius, setRadius] = useState(800)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

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

  async function runSearch(address: string) {
    if (!address.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)
    setSaved(false)

    try {
      const location = await geocodeAddress(address.trim())
      if (!location) {
        setError('Address not found. Try a more specific Columbus, OH address.')
        return
      }

      const [aqi, amenity, crime] = await Promise.all([
        fetchAQI(location.lat, location.lng),
        fetchAmenityScores(location.lat, location.lng, radius),
        fetchCrimeScore(location.lat, location.lng),
      ])

      setAqiData(aqi)
      setAmenityData(amenity)
      setCrimeData(crime)
      setFetchedAt(new Date())
      setResult(buildMetrics(address.trim(), location, aqi, amenity, crime))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
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
        setResult(prev => prev && buildMetrics(prev.address, prev.location, aqiData, amenity, crimeData, prev.id))
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
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter a Columbus, OH address..."
          className="flex-1 rounded-xl px-4 py-3 text-sm text-white placeholder-[#a0a0a0] outline-none focus:ring-2 focus:ring-[#f97316] transition-all"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-5 py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#f97316' }}
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
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
                >
                  {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save this address'}
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricCard
              label="Air Quality (AQI)"
              value={`${result.aqi}`}
              score={result.aqiScore}
              description={result.aqiCategory}
              source="Open-Meteo Air Quality API"
              updated={updatedLabel}
            />
            <MetricCard
              label="Walkability"
              value={`${result.walkabilityScore}/100`}
              score={result.walkabilityScore}
              description="Based on nearby amenities"
              source="OpenStreetMap (Overpass)"
              updated={updatedLabel}
            />
            <MetricCard
              label="Grocery Access"
              value={`${result.groceryCount} stores`}
              score={result.groceryScore}
              description={`Within ${amenityData.radius}m`}
              extra={nearestLabel(amenityData.nearestGrocery) && (
                <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(amenityData.nearestGrocery)}</p>
              )}
              source="OpenStreetMap (Overpass)"
              updated={updatedLabel}
            />
            <MetricCard
              label="Transit Access"
              value={`${result.transitCount} stops`}
              score={result.transitScore}
              description="Bus stops & stations within 800m"
              source="OpenStreetMap (Overpass)"
              updated={updatedLabel}
            />
            <MetricCard
              label="Green Space"
              value={`${result.parkCount} parks`}
              score={result.greenScore}
              description={`Parks within ${amenityData.radius}m`}
              extra={nearestLabel(amenityData.nearestPark) && (
                <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(amenityData.nearestPark)}</p>
              )}
              source="OpenStreetMap (Overpass)"
              updated={updatedLabel}
            />
            <MetricCard
              label="Safety / Crime"
              value={`${result.crimeIncidentCount} incidents`}
              score={result.safetyScore}
              description={result.safetyNote || (result.crimeTopTypes.length ? `Top: ${result.crimeTopTypes.join(', ')}` : 'Within 1km, last 12 months')}
              source="City of Columbus GIS"
              updated={updatedLabel}
            />
            <MetricCard
              label="Healthcare Access"
              value={`${result.healthcareCount} facilities`}
              score={result.healthcareScore}
              description={`Hospitals, clinics & pharmacies within ${amenityData.radius}m`}
              extra={nearestLabel(amenityData.nearestHealthcare) && (
                <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(amenityData.nearestHealthcare)}</p>
              )}
              source="OpenStreetMap (Overpass)"
              updated={updatedLabel}
            />
            <MetricCard
              label="Schools Nearby"
              value={`${result.schoolCount} schools`}
              score={result.schoolScore}
              description={`Within ${amenityData.radius}m`}
              extra={nearestLabel(amenityData.nearestSchool) && (
                <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(amenityData.nearestSchool)}</p>
              )}
              source="OpenStreetMap (Overpass)"
              updated={updatedLabel}
            />
            <MetricCard
              label="Dining & Cafes"
              value={`${result.diningCount} spots`}
              score={result.diningScore}
              description={`Restaurants & cafes within ${amenityData.radius}m`}
              extra={nearestLabel(amenityData.nearestDining) && (
                <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(amenityData.nearestDining)}</p>
              )}
              source="OpenStreetMap (Overpass)"
              updated={updatedLabel}
            />
            <MetricCard
              label="Libraries"
              value={`${result.libraryCount} libraries`}
              score={result.libraryScore}
              description="Within 1.6km"
              extra={nearestLabel(amenityData.nearestLibrary) && (
                <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(amenityData.nearestLibrary)}</p>
              )}
              source="OpenStreetMap (Overpass)"
              updated={updatedLabel}
            />
            <MetricCard
              label="Banks / ATMs"
              value={`${result.bankCount} found`}
              score={result.bankScore}
              description="Within 800m"
              extra={nearestLabel(amenityData.nearestBank) && (
                <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(amenityData.nearestBank)}</p>
              )}
              source="OpenStreetMap (Overpass)"
              updated={updatedLabel}
            />
            <MetricCard
              label="Places of Worship"
              value={`${result.worshipCount} found`}
              score={result.worshipScore}
              description="Within 1.6km"
              extra={nearestLabel(amenityData.nearestWorship) && (
                <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(amenityData.nearestWorship)}</p>
              )}
              source="OpenStreetMap (Overpass)"
              updated={updatedLabel}
            />
            <MetricCard
              label="Parking"
              value={`${result.parkingCount} found`}
              score={result.parkingScore}
              description="Within 400m"
              extra={nearestLabel(amenityData.nearestParking) && (
                <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(amenityData.nearestParking)}</p>
              )}
              source="OpenStreetMap (Overpass)"
              updated={updatedLabel}
            />
            <div
              className="rounded-xl border p-4 flex flex-col items-center justify-center"
              style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
            >
              <p style={{ color: '#a0a0a0' }} className="text-xs mb-1 uppercase tracking-wider font-medium">Overall Score</p>
              <p className="text-4xl font-bold" style={{ color: '#f97316' }}>{result.overallScore}</p>
              <p style={{ color: '#a0a0a0' }} className="text-xs mt-1">out of 100</p>
            </div>
          </div>

          <LocalNews query={result.address} />
        </div>
      )}
    </div>
  )
}
