import { AddressMetrics, AmenityPlaces, NearestAmenity } from '@/lib/types'
import MetricCard from './MetricCard'
import LocalNews from './LocalNews'

interface AddressResultsProps {
  metrics: AddressMetrics
  updated?: string
}

const NA = 'Data not available - refresh to update'

const EMPTY_PLACES: AmenityPlaces = {
  grocery: [],
  transit: [],
  park: [],
  school: [],
  healthcare: [],
  dining: [],
  library: [],
  bank: [],
  worship: [],
  parking: [],
}

function fmtCount(count: number | undefined, suffix: string): string {
  return count === undefined ? NA : `${count} ${suffix}`
}

function fmtScore(score: number | undefined): string {
  return score === undefined ? NA : `${score}/100`
}

export function nearestLabel(nearest: NearestAmenity | null | undefined): string | undefined {
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

function combinedWalkabilityPlaces(places: AmenityPlaces | undefined): NearestAmenity[] {
  const safePlaces = places ?? EMPTY_PLACES
  return [...(safePlaces.grocery ?? []), ...(safePlaces.transit ?? []), ...(safePlaces.park ?? [])]
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

function amenityDetail(
  nearest: NearestAmenity | null | undefined,
  count: number | undefined,
  nearestNoun: string,
  countSingular: string,
  countPlural: string,
  radiusMeters: number,
  places: NearestAmenity[] | undefined,
  placesLabel: string
): React.ReactNode {
  if (count === undefined) {
    return <p>{NA}</p>
  }

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
  const places = metrics.places ?? EMPTY_PLACES
  const radius = metrics.radius ?? 800

  switch (metricKey) {
    case 'aqi': {
      if (metrics.aqi === undefined || metrics.aqiCategory === undefined) {
        return <p>{NA}</p>
      }
      const info = AQI_INFO[metrics.aqiCategory] ?? { quality: 'uncertain', risk: 'an uncertain level of risk' }
      return (
        <p>
          This area has an AQI of <strong>{metrics.aqi} ({metrics.aqiCategory})</strong>. Air quality is considered{' '}
          {info.quality}, and air pollution poses <strong>{info.risk}</strong>.
        </p>
      )
    }
    case 'walkability': {
      if (metrics.walkabilityScore === undefined || metrics.groceryCount === undefined || metrics.transitCount === undefined || metrics.parkCount === undefined) {
        return <p>{NA}</p>
      }
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
      if (metrics.crimeIncidentCount === undefined || metrics.safetyScore === undefined) {
        return <p>{NA}</p>
      }
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
  const radius = metrics.radius ?? 800
  const places = metrics.places ?? EMPTY_PLACES
  const location = metrics.location ?? { lat: 0, lng: 0, formattedAddress: metrics.address ?? '' }
  const center = { lat: location.lat, lng: location.lng }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Air Quality (AQI)"
          value={metrics.aqi === undefined ? NA : `${metrics.aqi}`}
          score={metrics.aqiScore ?? 0}
          description={metrics.aqiCategory ?? NA}
          source="Open-Meteo Air Quality API"
          updated={updated}
          metricKey="aqi"
          center={center}
          category={metrics.aqiCategory}
          detail={buildDetail('aqi', metrics)}
        />
        <MetricCard
          label="Walkability"
          value={fmtScore(metrics.walkabilityScore)}
          score={metrics.walkabilityScore ?? 0}
          description="Based on nearby amenities"
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="walkability"
          center={center}
          places={combinedWalkabilityPlaces(places).slice(0, 8)}
          searchRadius={radius}
          detail={buildDetail('walkability', metrics)}
        />
        <MetricCard
          label="Grocery Access"
          value={fmtCount(metrics.groceryCount, 'stores')}
          score={metrics.groceryScore ?? 0}
          description={`Within ${radius}m`}
          extra={nearestLabel(metrics.nearestGrocery) && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(metrics.nearestGrocery)}</p>
          )}
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="grocery"
          radius={radius}
          places={places?.grocery}
          center={center}
          searchRadius={radius}
          detail={buildDetail('grocery', metrics)}
        />
        <MetricCard
          label="Transit Access"
          value={fmtCount(metrics.transitCount, 'stops')}
          score={metrics.transitScore ?? 0}
          description="Bus stops & stations within 800m"
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="transit"
          radius={radius}
          places={places?.transit}
          center={center}
          searchRadius={radius}
          detail={buildDetail('transit', metrics)}
        />
        <MetricCard
          label="Green Space"
          value={fmtCount(metrics.parkCount, 'parks')}
          score={metrics.greenScore ?? 0}
          description={`Parks within ${radius}m`}
          extra={nearestLabel(metrics.nearestPark) && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(metrics.nearestPark)}</p>
          )}
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="green"
          radius={radius}
          places={places?.park}
          center={center}
          searchRadius={radius}
          detail={buildDetail('green', metrics)}
        />
        <MetricCard
          label="Safety / Crime"
          value={fmtCount(metrics.crimeIncidentCount, 'incidents')}
          score={metrics.safetyScore ?? 0}
          description={metrics.safetyNote || ((metrics.crimeTopTypes ?? []).length ? `Top: ${(metrics.crimeTopTypes ?? []).join(', ')}` : 'Within 1km, last 12 months')}
          source="City of Columbus GIS"
          updated={updated}
          metricKey="safety"
          center={center}
          crimeIncidents={metrics.crimeIncidents}
          detail={buildDetail('safety', metrics)}
        />
        <MetricCard
          label="Healthcare Access"
          value={fmtCount(metrics.healthcareCount, 'facilities')}
          score={metrics.healthcareScore ?? 0}
          description={`Hospitals, clinics & pharmacies within ${radius}m`}
          extra={nearestLabel(metrics.nearestHealthcare) && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(metrics.nearestHealthcare)}</p>
          )}
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="healthcare"
          radius={radius}
          places={places?.healthcare}
          center={center}
          searchRadius={radius}
          detail={buildDetail('healthcare', metrics)}
        />
        <MetricCard
          label="Schools Nearby"
          value={fmtCount(metrics.schoolCount, 'schools')}
          score={metrics.schoolScore ?? 0}
          description={`Within ${radius}m`}
          extra={nearestLabel(metrics.nearestSchool) && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(metrics.nearestSchool)}</p>
          )}
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="school"
          radius={radius}
          places={places?.school}
          center={center}
          searchRadius={radius}
          detail={buildDetail('school', metrics)}
        />
        <MetricCard
          label="Dining & Cafes"
          value={fmtCount(metrics.diningCount, 'spots')}
          score={metrics.diningScore ?? 0}
          description={`Restaurants & cafes within ${radius}m`}
          extra={nearestLabel(metrics.nearestDining) && (
            <p style={{ color: '#a0a0a0' }} className="text-xs">{nearestLabel(metrics.nearestDining)}</p>
          )}
          source="OpenStreetMap (Overpass)"
          updated={updated}
          metricKey="dining"
          radius={radius}
          places={places?.dining}
          center={center}
          searchRadius={radius}
          detail={buildDetail('dining', metrics)}
        />
        <MetricCard
          label="Libraries"
          value={fmtCount(metrics.libraryCount, 'libraries')}
          score={metrics.libraryScore ?? 0}
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
          searchRadius={radius}
          detail={buildDetail('library', metrics)}
        />
        <MetricCard
          label="Banks / ATMs"
          value={fmtCount(metrics.bankCount, 'found')}
          score={metrics.bankScore ?? 0}
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
          searchRadius={radius}
          detail={buildDetail('bank', metrics)}
        />
        <MetricCard
          label="Places of Worship"
          value={fmtCount(metrics.worshipCount, 'found')}
          score={metrics.worshipScore ?? 0}
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
          searchRadius={radius}
          detail={buildDetail('worship', metrics)}
        />
        <MetricCard
          label="Parking"
          value={fmtCount(metrics.parkingCount, 'found')}
          score={metrics.parkingScore ?? 0}
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
          searchRadius={radius}
          detail={buildDetail('parking', metrics)}
        />
        <div
          className="rounded-xl border p-4 flex flex-col items-center justify-center"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
        >
          <p style={{ color: '#a0a0a0' }} className="text-xs mb-1 uppercase tracking-wider font-medium">Overall Score</p>
          <p className="text-4xl font-bold" style={{ color: '#f97316' }}>{metrics.overallScore ?? '—'}</p>
          <p style={{ color: '#a0a0a0' }} className="text-xs mt-1">out of 100</p>
        </div>
      </div>

      <LocalNews query={metrics.address ?? location.formattedAddress} />
    </div>
  )
}
