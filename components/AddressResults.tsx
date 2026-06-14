import { AddressMetrics, NearestAmenity } from '@/lib/types'
import MetricCard from './MetricCard'
import LocalNews from './LocalNews'

interface AddressResultsProps {
  metrics: AddressMetrics
  updated?: string
}

export function nearestLabel(nearest: NearestAmenity | null): string | undefined {
  if (!nearest) return undefined
  return `Nearest: ${nearest.name} — ${nearest.distanceKm}km`
}

export default function AddressResults({ metrics, updated }: AddressResultsProps) {
  const fetchedAt = metrics.fetchedAt
  const radius = metrics.radius
  const places = metrics.places

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Air Quality (AQI)"
          value={`${metrics.aqi}`}
          score={metrics.aqiScore}
          description={metrics.aqiCategory}
          source="Open-Meteo Air Quality API"
          updated={updated}
          metricKey="aqi"
          fetchedAt={fetchedAt}
        />
        <MetricCard
          label="Walkability"
          value={`${metrics.walkabilityScore}/100`}
          score={metrics.walkabilityScore}
          description="Based on nearby amenities"
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="walkability"
          fetchedAt={fetchedAt}
        />
        <MetricCard
          label="Grocery Access"
          value={`${metrics.groceryCount} stores`}
          score={metrics.groceryScore}
          description={`Within ${metrics.radius}m`}
          extra={nearestLabel(metrics.nearestGrocery) && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(metrics.nearestGrocery)}</p>
          )}
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="grocery"
          fetchedAt={fetchedAt}
          radius={radius}
          places={places?.grocery}
        />
        <MetricCard
          label="Transit Access"
          value={`${metrics.transitCount} stops`}
          score={metrics.transitScore}
          description="Bus stops & stations within 800m"
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="transit"
          fetchedAt={fetchedAt}
          radius={radius}
          places={places?.transit}
        />
        <MetricCard
          label="Green Space"
          value={`${metrics.parkCount} parks`}
          score={metrics.greenScore}
          description={`Parks within ${metrics.radius}m`}
          extra={nearestLabel(metrics.nearestPark) && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(metrics.nearestPark)}</p>
          )}
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="green"
          fetchedAt={fetchedAt}
          radius={radius}
          places={places?.park}
        />
        <MetricCard
          label="Safety / Crime"
          value={`${metrics.crimeIncidentCount} incidents`}
          score={metrics.safetyScore}
          description={metrics.safetyNote || (metrics.crimeTopTypes.length ? `Top: ${metrics.crimeTopTypes.join(', ')}` : 'Within 1km, last 12 months')}
          source="City of Columbus GIS"
          updated={updated}
          metricKey="safety"
          fetchedAt={fetchedAt}
        />
        <MetricCard
          label="Healthcare Access"
          value={`${metrics.healthcareCount} facilities`}
          score={metrics.healthcareScore}
          description={`Hospitals, clinics & pharmacies within ${metrics.radius}m`}
          extra={nearestLabel(metrics.nearestHealthcare) && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(metrics.nearestHealthcare)}</p>
          )}
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="healthcare"
          fetchedAt={fetchedAt}
          radius={radius}
          places={places?.healthcare}
        />
        <MetricCard
          label="Schools Nearby"
          value={`${metrics.schoolCount} schools`}
          score={metrics.schoolScore}
          description={`Within ${metrics.radius}m`}
          extra={nearestLabel(metrics.nearestSchool) && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(metrics.nearestSchool)}</p>
          )}
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="school"
          fetchedAt={fetchedAt}
          radius={radius}
          places={places?.school}
        />
        <MetricCard
          label="Dining & Cafes"
          value={`${metrics.diningCount} spots`}
          score={metrics.diningScore}
          description={`Restaurants & cafes within ${metrics.radius}m`}
          extra={nearestLabel(metrics.nearestDining) && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(metrics.nearestDining)}</p>
          )}
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="dining"
          fetchedAt={fetchedAt}
          radius={radius}
          places={places?.dining}
        />
        <MetricCard
          label="Libraries"
          value={`${metrics.libraryCount} libraries`}
          score={metrics.libraryScore}
          description="Within 1.6km"
          extra={nearestLabel(metrics.nearestLibrary) && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(metrics.nearestLibrary)}</p>
          )}
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="library"
          fetchedAt={fetchedAt}
          radius={1600}
          places={places?.library}
        />
        <MetricCard
          label="Banks / ATMs"
          value={`${metrics.bankCount} found`}
          score={metrics.bankScore}
          description="Within 800m"
          extra={nearestLabel(metrics.nearestBank) && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(metrics.nearestBank)}</p>
          )}
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="bank"
          fetchedAt={fetchedAt}
          radius={800}
          places={places?.bank}
        />
        <MetricCard
          label="Places of Worship"
          value={`${metrics.worshipCount} found`}
          score={metrics.worshipScore}
          description="Within 1.6km"
          extra={nearestLabel(metrics.nearestWorship) && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(metrics.nearestWorship)}</p>
          )}
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="worship"
          fetchedAt={fetchedAt}
          radius={1600}
          places={places?.worship}
        />
        <MetricCard
          label="Parking"
          value={`${metrics.parkingCount} found`}
          score={metrics.parkingScore}
          description="Within 400m"
          extra={nearestLabel(metrics.nearestParking) && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(metrics.nearestParking)}</p>
          )}
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="parking"
          fetchedAt={fetchedAt}
          radius={400}
          places={places?.parking}
        />
        <div
          className="rounded-xl border p-4 flex flex-col items-center justify-center"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
        >
          <p style={{ color: '#a0a0a0' }} className="text-xs mb-1 uppercase tracking-wider font-medium">Overall Score</p>
          <p className="text-4xl font-bold" style={{ color: '#f97316' }}>{metrics.overallScore}</p>
          <p style={{ color: '#a0a0a0' }} className="text-xs mt-1">out of 100</p>
        </div>
      </div>

      <LocalNews query={metrics.address} />
    </div>
  )
}
