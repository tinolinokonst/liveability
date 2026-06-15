import { AddressMetrics, AmenityPlaces, NearestAmenity } from '@/lib/types'
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

function isAre(count: number): string {
  return count === 1 ? 'is' : 'are'
}

function radiusLabel(meters: number): string {
  return meters >= 1000 ? `${meters / 1000}km` : `${meters}m`
}

function joinAnd(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

const AQI_INFO: Record<string, { quality: string; risk: string }> = {
  'Good': { quality: 'satisfactory', risk: 'little or no risk' },
  'Moderate': { quality: 'acceptable', risk: 'a moderate health concern for sensitive groups' },
  'Unhealthy for Sensitive Groups': { quality: 'a concern for sensitive groups', risk: 'increased risk of effects for sensitive groups' },
  'Unhealthy': { quality: 'unhealthy', risk: 'increased risk of effects for everyone' },
  'Very Unhealthy': { quality: 'very unhealthy', risk: 'a health alert, with everyone likely affected' },
  'Hazardous': { quality: 'hazardous', risk: 'serious risk of health effects for the entire population' },
}

function placesParagraph(places: NearestAmenity[] | undefined, label: string, radiusMeters: number): React.ReactNode {
  if (!places || places.length === 0) return null
  const radiusStr = radiusLabel(radiusMeters)
  const shown = places.slice(0, 5)
  const items = shown.map(p => `${p.name} (${p.distanceKm}km)`).join(', ')
  const more = places.length > 5 ? `, + ${places.length - 5} more within ${radiusStr}` : ''
  return <p>{label} within {radiusStr}: {items}{more}.</p>
}

function combinedWalkabilityPlaces(places: AmenityPlaces): NearestAmenity[] {
  return [...(places.grocery ?? []), ...(places.transit ?? []), ...(places.park ?? [])]
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

function amenityDetail(
  nearest: NearestAmenity | null,
  count: number,
  nearestNoun: string,
  countSingular: string,
  countPlural: string,
  radiusMeters: number,
  places: NearestAmenity[] | undefined,
  placesLabel: string
): React.ReactNode {
  const radiusStr = radiusLabel(radiusMeters)
  const countNoun = count === 1 ? countSingular : countPlural

  const summary = !nearest ? (
    <p>There are no {countPlural} within {radiusStr}.</p>
  ) : (
    <p>
      The nearest {nearestNoun} is <strong>{nearest.name}, {nearest.distanceKm}km away</strong>. There {isAre(count)}{' '}
      <strong>{count} {countNoun}</strong> within {radiusStr}.
    </p>
  )

  return (
    <>
      {summary}
      {placesParagraph(places, placesLabel, radiusMeters)}
    </>
  )
}

function buildDetail(metricKey: string, metrics: AddressMetrics): React.ReactNode {
  const places = metrics.places
  const radius = metrics.radius

  switch (metricKey) {
    case 'aqi': {
      const info = AQI_INFO[metrics.aqiCategory] ?? { quality: 'uncertain', risk: 'an uncertain level of risk' }
      return (
        <p>
          This area has an AQI of <strong>{metrics.aqi} ({metrics.aqiCategory})</strong>. Air quality is considered{' '}
          {info.quality}, and air pollution poses <strong>{info.risk}</strong>.
        </p>
      )
    }
    case 'walkability': {
      const count = metrics.groceryCount + metrics.transitCount + metrics.parkCount
      const types: string[] = []
      if (metrics.groceryCount > 0) types.push('grocery stores')
      if (metrics.transitCount > 0) types.push('transit stops')
      if (metrics.parkCount > 0) types.push('green spaces')
      const including = types.length ? `, including ${joinAnd(types)}` : ''
      const combined = combinedWalkabilityPlaces(places)
      return (
        <>
          <p>
            This address has a walkability score of <strong>{metrics.walkabilityScore}/100</strong>. There {isAre(count)}{' '}
            <strong>{count} amenit{count === 1 ? 'y' : 'ies'}</strong> within an <strong>{radius}m</strong> walk{including}.
          </p>
          {placesParagraph(combined, 'Nearby amenities', radius)}
        </>
      )
    }
    case 'grocery':
      return amenityDetail(places?.grocery?.[0] ?? null, metrics.groceryCount, 'grocery store', 'grocery option', 'grocery options', radius, places?.grocery, 'Grocery stores')
    case 'transit':
      return amenityDetail(places?.transit?.[0] ?? null, metrics.transitCount, 'transit stop', 'transit stop', 'transit stops', 800, places?.transit, 'Transit stops')
    case 'green':
      return amenityDetail(places?.park?.[0] ?? null, metrics.parkCount, 'park', 'green space', 'green spaces', radius, places?.park, 'Green spaces')
    case 'healthcare':
      return amenityDetail(places?.healthcare?.[0] ?? null, metrics.healthcareCount, 'healthcare facility', 'healthcare facility', 'healthcare facilities', radius, places?.healthcare, 'Healthcare facilities')
    case 'school':
      return amenityDetail(places?.school?.[0] ?? null, metrics.schoolCount, 'school', 'school', 'schools', radius, places?.school, 'Schools')
    case 'dining':
      return amenityDetail(places?.dining?.[0] ?? null, metrics.diningCount, 'dining option', 'dining option', 'dining options', radius, places?.dining, 'Dining options')
    case 'library':
      return amenityDetail(places?.library?.[0] ?? null, metrics.libraryCount, 'library', 'library', 'libraries', 1600, places?.library, 'Libraries')
    case 'bank':
      return amenityDetail(places?.bank?.[0] ?? null, metrics.bankCount, 'bank or ATM', 'bank/ATM', 'banks/ATMs', 800, places?.bank, 'Banks/ATMs')
    case 'worship':
      return amenityDetail(places?.worship?.[0] ?? null, metrics.worshipCount, 'place of worship', 'place of worship', 'places of worship', 1600, places?.worship, 'Places of worship')
    case 'parking':
      return amenityDetail(places?.parking?.[0] ?? null, metrics.parkingCount, 'parking option', 'parking option', 'parking options', 400, places?.parking, 'Parking options')
    case 'safety': {
      const count = metrics.crimeIncidentCount
      return (
        <p>
          This area has a safety score of <strong>{metrics.safetyScore}/100</strong>, based on{' '}
          <strong>{count} incident{count === 1 ? '' : 's'}</strong> in the past 12 months within 1km.
          {metrics.safetyNote ? ` ${metrics.safetyNote}` : ''}
        </p>
      )
    }
    default:
      return undefined
  }
}

export default function AddressResults({ metrics, updated }: AddressResultsProps) {
  const radius = metrics.radius
  const places = metrics.places
  const center = { lat: metrics.location.lat, lng: metrics.location.lng }

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
          center={center}
          category={metrics.aqiCategory}
          detail={buildDetail('aqi', metrics)}
        />
        <MetricCard
          label="Walkability"
          value={`${metrics.walkabilityScore}/100`}
          score={metrics.walkabilityScore}
          description="Based on nearby amenities"
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="walkability"
          center={center}
          places={combinedWalkabilityPlaces(places).slice(0, 8)}
          searchRadius={metrics.radius}
          detail={buildDetail('walkability', metrics)}
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
          radius={radius}
          places={places?.grocery}
          center={center}
          searchRadius={metrics.radius}
          detail={buildDetail('grocery', metrics)}
        />
        <MetricCard
          label="Transit Access"
          value={`${metrics.transitCount} stops`}
          score={metrics.transitScore}
          description="Bus stops & stations within 800m"
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="transit"
          radius={radius}
          places={places?.transit}
          center={center}
          searchRadius={metrics.radius}
          detail={buildDetail('transit', metrics)}
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
          radius={radius}
          places={places?.park}
          center={center}
          searchRadius={metrics.radius}
          detail={buildDetail('green', metrics)}
        />
        <MetricCard
          label="Safety / Crime"
          value={`${metrics.crimeIncidentCount} incidents`}
          score={metrics.safetyScore}
          description={metrics.safetyNote || (metrics.crimeTopTypes.length ? `Top: ${metrics.crimeTopTypes.join(', ')}` : 'Within 1km, last 12 months')}
          source="City of Columbus GIS"
          updated={updated}
          metricKey="safety"
          center={center}
          crimeIncidents={metrics.crimeIncidents}
          detail={buildDetail('safety', metrics)}
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
          radius={radius}
          places={places?.healthcare}
          center={center}
          searchRadius={metrics.radius}
          detail={buildDetail('healthcare', metrics)}
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
          radius={radius}
          places={places?.school}
          center={center}
          searchRadius={metrics.radius}
          detail={buildDetail('school', metrics)}
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
          radius={radius}
          places={places?.dining}
          center={center}
          searchRadius={metrics.radius}
          detail={buildDetail('dining', metrics)}
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
          radius={1600}
          places={places?.library}
          center={center}
          searchRadius={metrics.radius}
          detail={buildDetail('library', metrics)}
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
          radius={800}
          places={places?.bank}
          center={center}
          searchRadius={metrics.radius}
          detail={buildDetail('bank', metrics)}
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
          radius={1600}
          places={places?.worship}
          center={center}
          searchRadius={metrics.radius}
          detail={buildDetail('worship', metrics)}
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
          radius={400}
          places={places?.parking}
          center={center}
          searchRadius={metrics.radius}
          detail={buildDetail('parking', metrics)}
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
