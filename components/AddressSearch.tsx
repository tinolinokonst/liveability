"use client"

import { useState, useEffect } from 'react'
import { geocodeAddress } from '@/lib/geocoding'
import { fetchAQI, AQIResult } from '@/lib/airquality'
import { fetchAmenityScores } from '@/lib/overpass'
import { fetchCrimeScore } from '@/lib/crime'
import { AddressMetrics, GeoLocation, AmenityScores, CrimeResult } from '@/lib/types'
import MetricCard from './MetricCard'
import LocalNews from './LocalNews'

interface AddressSearchProps {
  onAdd?: (metrics: AddressMetrics) => void
  compareCount?: number
}

const RADIUS_OPTIONS: Array<{ label: string; meters: number }> = [
  { label: '400m', meters: 400 },
  { label: '800m', meters: 800 },
  { label: '1.6km', meters: 1600 },
  { label: '3km', meters: 3000 },
]

function buildMetrics(
  address: string,
  location: GeoLocation,
  aqiData: AQIResult,
  amenityData: AmenityScores,
  crimeData: CrimeResult
): AddressMetrics {
  const overallScore = Math.round(
    aqiData.score * 0.20 +
    amenityData.walkabilityScore * 0.20 +
    amenityData.groceryScore * 0.10 +
    amenityData.transitScore * 0.10 +
    amenityData.greenScore * 0.10 +
    amenityData.schoolScore * 0.05 +
    amenityData.healthcareScore * 0.10 +
    amenityData.diningScore * 0.05 +
    crimeData.safetyScore * 0.10
  )

  return {
    id: crypto.randomUUID(),
    address,
    location,
    aqi: aqiData.aqi,
    aqiCategory: aqiData.category,
    aqiScore: aqiData.score,
    walkabilityScore: amenityData.walkabilityScore,
    groceryScore: amenityData.groceryScore,
    transitScore: amenityData.transitScore,
    greenScore: amenityData.greenScore,
    groceryCount: amenityData.groceryCount,
    transitCount: amenityData.transitCount,
    parkCount: amenityData.parkCount,
    schoolCount: amenityData.schoolCount,
    schoolScore: amenityData.schoolScore,
    healthcareCount: amenityData.healthcareCount,
    healthcareScore: amenityData.healthcareScore,
    diningCount: amenityData.diningCount,
    diningScore: amenityData.diningScore,
    gymCount: amenityData.gymCount,
    gymScore: amenityData.gymScore,
    crimeIncidentCount: crimeData.incidentCount,
    crimeTopTypes: crimeData.topIncidentTypes,
    safetyScore: crimeData.safetyScore,
    safetyNote: crimeData.note,
    overallScore,
  }
}

function nearestLabel(nearest: { name: string; distanceKm: number } | null): string | undefined {
  if (!nearest) return undefined
  return `Nearest: ${nearest.name} — ${nearest.distanceKm}km`
}

export default function AddressSearch({ onAdd, compareCount = 0 }: AddressSearchProps) {
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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const location = await geocodeAddress(query.trim())
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
      setResult(buildMetrics(query.trim(), location, aqi, amenity, crime))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
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
        setResult(prev => prev && buildMetrics(prev.address, prev.location, aqiData, amenity, crimeData))
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

  const updatedLabel = fetchedAt
    ? `Updated ${Math.max(0, Math.round((Date.now() - fetchedAt.getTime()) / 1000)) < 60 ? 'just now' : 'recently'}`
    : undefined

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
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
