"use client"

import { useState, useEffect } from 'react'
import { Wind, Shield, Navigation, ShoppingBag, Sun, Volume2, Users, Leaf, DollarSign, LucideIcon } from 'lucide-react'
import { AddressMetrics, AmenityPlaces, NearestAmenity } from '@/lib/types'
import { getColumbusAverages } from '@/lib/neighborhoods'
import MetricCard from './MetricCard'
import InfoCard from './InfoCard'
import LocalNews from './LocalNews'
import NearestEssentials from './NearestEssentials'

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

// ─── helpers ────────────────────────────────────────────────────────────────

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
  Good: { quality: 'satisfactory', risk: 'little or no risk' },
  Moderate: { quality: 'acceptable', risk: 'a moderate health concern for sensitive groups' },
  'Unhealthy for Sensitive Groups': { quality: 'a concern for sensitive groups', risk: 'increased risk of effects for sensitive groups' },
  Unhealthy: { quality: 'unhealthy', risk: 'increased risk of effects for everyone' },
  'Very Unhealthy': { quality: 'very unhealthy', risk: 'a health alert, with everyone likely affected' },
  Hazardous: { quality: 'hazardous', risk: 'serious risk of health effects for the entire population' },
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
  if (count === undefined) return <p>{NA}</p>

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

// ─── comparison context ──────────────────────────────────────────────────────

function ComparisonBlock({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-xs leading-relaxed"
      style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}
    >
      <p className="font-semibold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: '#f97316' }}>
        How this compares
      </p>
      <p style={{ color: '#a0a0a0' }}>{children}</p>
    </div>
  )
}

const COLUMBUS_AVGS = getColumbusAverages()

function compareDir(score: number, avg: number): 'above' | 'below' | 'similar' {
  if (Math.abs(score - avg) < 5) return 'similar'
  return score > avg ? 'above' : 'below'
}

function colAqiCat(aqi: number): string {
  if (aqi > 200) return 'Very Unhealthy'
  if (aqi > 150) return 'Unhealthy'
  if (aqi > 100) return 'Unhealthy for Sensitive Groups'
  if (aqi > 50) return 'Moderate'
  return 'Good'
}

function avgComparison(label: string, score: number | undefined, avg: number): React.ReactNode {
  if (score == null) return null
  const dir = compareDir(score, avg)
  const diff = Math.abs(score - avg)
  const rel = dir === 'similar'
    ? `comparable to the Columbus neighborhood average of ${avg}/100`
    : `${dir} the Columbus average of ${avg}/100 by ${diff} points`
  return <ComparisonBlock>{label} is <strong>{rel}</strong>.</ComparisonBlock>
}

export function buildComparison(metricKey: string, metrics: AddressMetrics): React.ReactNode {
  switch (metricKey) {
    case 'aqi': {
      const colAqi = metrics.columbusAqi
      if (colAqi == null || metrics.aqi == null) return null
      const diff = metrics.aqi - colAqi
      const absDiff = Math.abs(diff)
      const colCat = colAqiCat(colAqi)
      let rel: string
      if (absDiff < 5) {
        rel = `similar to Columbus's citywide reading of AQI ${colAqi} (${colCat}) today`
      } else if (diff < 0) {
        rel = `${absDiff} pts lower than Columbus's citywide AQI of ${colAqi} (${colCat}) today — better air`
      } else {
        rel = `${absDiff} pts higher than Columbus's citywide AQI of ${colAqi} (${colCat}) today — worse air`
      }
      return <ComparisonBlock>This AQI of <strong>{metrics.aqi}</strong> is <strong>{rel}</strong>.</ComparisonBlock>
    }
    case 'walkability':  return avgComparison('Walkability', metrics.walkabilityScore, COLUMBUS_AVGS.walkability)
    case 'grocery':      return avgComparison('Grocery access', metrics.groceryScore, COLUMBUS_AVGS.grocery)
    case 'transit':      return avgComparison('Transit access', metrics.transitScore, COLUMBUS_AVGS.transit)
    case 'green':        return avgComparison('Green space', metrics.greenScore, COLUMBUS_AVGS.green)
    case 'safety':       return avgComparison('Safety score', metrics.safetyScore, COLUMBUS_AVGS.safety)
    case 'healthcare':   return avgComparison('Healthcare access', metrics.healthcareScore, COLUMBUS_AVGS.healthcare)
    case 'school':       return avgComparison('Schools score', metrics.schoolScore, COLUMBUS_AVGS.school)
    case 'dining':       return avgComparison('Dining score', metrics.diningScore, COLUMBUS_AVGS.dining)
    default:             return null
  }
}

// ─── modal detail builders ───────────────────────────────────────────────────

export function buildDetail(metricKey: string, metrics: AddressMetrics): React.ReactNode {
  const places = metrics.places ?? EMPTY_PLACES
  const radius = metrics.radius ?? 800

  switch (metricKey) {
    case 'aqi': {
      if (metrics.aqi === undefined || metrics.aqiCategory === undefined) return <p>{NA}</p>
      const info = AQI_INFO[metrics.aqiCategory] ?? { quality: 'uncertain', risk: 'an uncertain level of risk' }
      return (
        <p>
          This area has an AQI of <strong>{metrics.aqi} ({metrics.aqiCategory})</strong>. Air quality is considered{' '}
          {info.quality}, and air pollution poses <strong>{info.risk}</strong>.
        </p>
      )
    }
    case 'walkability': {
      if (metrics.walkabilityScore === undefined || metrics.groceryCount === undefined || metrics.transitCount === undefined || metrics.parkCount === undefined) return <p>{NA}</p>
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
    case 'transit': {
      const count = metrics.transitCount
      const list = places?.transit ?? []
      if (count === undefined) return <p>{NA}</p>
      const radiusStr = radiusLabel(800)
      const nearest = list[0]
      const summary = !nearest ? (
        <p>There are no transit stops within {radiusStr}.</p>
      ) : (
        <p>
          The nearest stop is <strong>{nearest.name}</strong>
          {nearest.category ? ` (${nearest.category})` : ''}, <strong>{nearest.distanceKm}km away</strong>.{' '}
          There {isAre(count)} <strong>{count} transit stop{count === 1 ? '' : 's'}</strong> within {radiusStr}.
        </p>
      )
      const stopList = list.slice(0, 8)
      return (
        <>
          {summary}
          {stopList.length > 0 && (
            <p>
              Nearby stops: {stopList.map((s, i) => (
                <span key={i}>{s.name}{s.category ? ` — ${s.category}` : ''} ({s.distanceKm}km){i < stopList.length - 1 ? '; ' : ''}</span>
              ))}.
            </p>
          )}
        </>
      )
    }
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
      if (metrics.crimeIncidentCount === undefined || metrics.safetyScore === undefined) return <p>{NA}</p>
      const count = metrics.crimeIncidentCount
      const stateCtx = metrics.stateCrimeContext
      const fbi = metrics.fbiCrime
      return (
        <>
          <p>
            This area has a safety score of <strong>{metrics.safetyScore}/100</strong>, based on{' '}
            <strong>{count} incident{count === 1 ? '' : 's'}</strong> in the past 12 months within 1km.
            {metrics.safetyNote ? ` ${metrics.safetyNote}` : ''}
          </p>
          {stateCtx?.available && stateCtx.rate !== null && (
            <p>
              <strong>State-level context:</strong> {stateCtx.state} reported a violent crime rate of{' '}
              <strong>{stateCtx.rate} per 100,000 residents</strong>
              {stateCtx.year ? ` in ${stateCtx.year}` : ''}, per the FBI Crime Data Explorer.
              This is statewide context, separate from the local incident count above.
            </p>
          )}
          {fbi?.available && fbi.violentCrimeRate !== null && (
            <p>
              <strong>Citywide context (FBI):</strong> Columbus Division of Police reported a violent crime rate of{' '}
              <strong>{fbi.violentCrimeRate} per 100,000 residents</strong>
              {fbi.year ? ` in ${fbi.year}` : ''}, per the FBI Crime Data Explorer. This is a city-level figure, not address-specific.
            </p>
          )}
        </>
      )
    }
    case 'sunlight': {
      if (!metrics.sunlight?.available || metrics.sunlight.score === null) {
        return <p>{metrics.sunlight?.message ?? 'Solar data not available for this building'}</p>
      }
      return (
        <p>
          This building&apos;s roof receives an estimated <strong>{metrics.sunlight.hoursPerYear} hours</strong> of
          sunshine per year, giving it a sunlight score of <strong>{metrics.sunlight.score}/100</strong> based on
          Google&apos;s Solar API rooftop exposure modeling.
        </p>
      )
    }
    case 'noise': {
      if (!metrics.noise?.available || metrics.noise.score === null) {
        return <p>{metrics.noise?.message ?? 'Noise estimate unavailable'}</p>
      }
      const road = metrics.noise.nearestRoad
      return (
        <p>
          This is an <strong>estimate</strong>, not a direct noise measurement. Based on nearby roads in
          OpenStreetMap, this address has a noise score of <strong>{metrics.noise.score}/100 ({metrics.noise.level})</strong>.
          {road && (
            <> The nearest classified road is <strong>{road.name}</strong> ({road.classification}),{' '}
            {road.distanceKm}km away.</>
          )}
        </p>
      )
    }
    case 'demographics': {
      if (!metrics.demographics?.available) {
        return <p>{metrics.demographics?.message ?? 'Demographic data unavailable for this location'}</p>
      }
      const { medianHouseholdIncome, totalPopulation, tract } = metrics.demographics
      return (
        <p>
          Demographic data from the US Census Bureau&apos;s American Community Survey for the Census tract this
          address falls within{tract ? ` (tract ${tract})` : ''}.{' '}
          {medianHouseholdIncome !== null && <>Median household income is <strong>${medianHouseholdIncome.toLocaleString()}</strong>. </>}
          {totalPopulation !== null && <>Total population is <strong>{totalPopulation.toLocaleString()}</strong>.</>}
        </p>
      )
    }
    case 'census': {
      // Prefer censusData (richer, has medianAge) over legacy demographics field
      const data = metrics.censusData ?? metrics.demographics
      if (!data?.available) {
        return <p>{data?.message ?? 'Demographic data unavailable for this location'}</p>
      }
      const { medianHouseholdIncome, totalPopulation, medianAge, tract } = data
      return (
        <>
          <p>
            Data from the US Census Bureau&apos;s American Community Survey for the Census tract this address falls
            within{tract ? ` (tract ${tract})` : ''}.
          </p>
          <ul style={{ paddingLeft: '1rem', listStyleType: 'disc' }} className="flex flex-col gap-1">
            {medianHouseholdIncome !== null && (
              <li>Median household income: <strong>${medianHouseholdIncome.toLocaleString()}</strong></li>
            )}
            {totalPopulation !== null && (
              <li>Census tract population: <strong>{totalPopulation.toLocaleString()}</strong></li>
            )}
            {medianAge != null && (
              <li>Median age: <strong>{medianAge} years</strong></li>
            )}
          </ul>
          <p>This is informational context only — it is not scored or factored into the overall liveability score.</p>
        </>
      )
    }
    default:
      return undefined
  }
}

// ─── composite score ─────────────────────────────────────────────────────────

function computeCompositeScore(metrics: AddressMetrics): number {
  const WEIGHTS: Record<string, number> = {
    aqi: 0.18, walkability: 0.18, grocery: 0.08, transit: 0.08, green: 0.08,
    school: 0.05, healthcare: 0.08, dining: 0.04, safety: 0.10,
    sunlight: 0.05, noise: 0.04,
  }

  const available: Array<[number, number]> = [] // [score, weight]
  const add = (score: number | undefined | null, key: string) => {
    if (score != null) available.push([score, WEIGHTS[key]])
  }

  add(metrics.aqiScore, 'aqi')
  add(metrics.walkabilityScore, 'walkability')
  add(metrics.groceryScore, 'grocery')
  add(metrics.transitScore, 'transit')
  add(metrics.greenScore, 'green')
  add(metrics.schoolScore, 'school')
  add(metrics.healthcareScore, 'healthcare')
  add(metrics.diningScore, 'dining')
  add(metrics.safetyScore, 'safety')
  if (metrics.sunlight?.available) add(metrics.sunlight.score, 'sunlight')
  if (metrics.noise?.available) add(metrics.noise.score, 'noise')

  if (available.length === 0) return metrics.overallScore ?? 0
  const totalW = available.reduce((s, [, w]) => s + w, 0)
  return Math.round(available.reduce((s, [v, w]) => s + v * w, 0) / totalW)
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 65) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Poor'
}

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 65) return '#f59e0b'
  if (score >= 50) return '#f97316'
  return '#ef4444'
}

function compositeSubtitle(metrics: AddressMetrics): string {
  const labeled: Array<{ label: string; score: number }> = []
  const add = (score: number | undefined | null, label: string) => {
    if (score != null) labeled.push({ label, score })
  }

  add(metrics.aqiScore, 'air quality')
  add(metrics.walkabilityScore, 'walkability')
  add(metrics.safetyScore, 'safety')
  add(metrics.transitScore, 'transit access')
  add(metrics.groceryScore, 'grocery access')
  add(metrics.healthcareScore, 'healthcare')
  add(metrics.greenScore, 'green space')
  if (metrics.sunlight?.available) add(metrics.sunlight.score, 'sunlight')
  if (metrics.noise?.available) add(metrics.noise.score, 'noise levels')

  if (labeled.length === 0) return 'Based on local data sources'

  labeled.sort((a, b) => b.score - a.score)
  const best = labeled[0]
  const worst = labeled[labeled.length - 1]

  const highLabel = (s: number) => s >= 80 ? 'Excellent' : s >= 65 ? 'Strong' : 'Good'
  const lowLabel = (s: number) => s < 30 ? 'Low' : s < 45 ? 'Weak' : 'Moderate'

  const parts: string[] = [`${highLabel(best.score)} ${best.label}`]
  if (worst.label !== best.label && worst.score < 60) {
    parts.push(`${lowLabel(worst.score)} ${worst.label}`)
  }
  return parts.join(' · ')
}

// ─── Rentcast cost of living ─────────────────────────────────────────────────

interface RentEstimate {
  rent: number
  rentRangeLow: number
  rentRangeHigh: number
  subjectProperty?: { propertyType?: string; bedrooms?: number; bathrooms?: number }
}

function RentcastCostCard({ address }: { address: string }) {
  const [data, setData] = useState<RentEstimate | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    if (!address) { setStatus('error'); return }
    fetch(`/api/rentcast?mode=estimate&address=${encodeURIComponent(address)}`)
      .then(r => r.json())
      .then((json: RentEstimate & { error?: string }) => {
        if (json.error || !json.rent) { setStatus('error'); return }
        setData(json)
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [address])

  const prop = data?.subjectProperty

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
    >
      <div className="flex items-center justify-between">
        <span style={{ color: '#a0a0a0' }} className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign size={14} />
          Cost of Living
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: '#a0a0a0', backgroundColor: '#2a2a2a' }}>
          Rent estimate
        </span>
      </div>

      {status === 'loading' && (
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-8 w-28 rounded-lg" style={{ backgroundColor: '#2a2a2a' }} />
          <div className="h-3 w-40 rounded" style={{ backgroundColor: '#2a2a2a' }} />
        </div>
      )}

      {status === 'ok' && data && (
        <>
          <div className="text-2xl font-bold text-white">
            ${data.rent.toLocaleString()}<span className="text-base font-normal" style={{ color: '#a0a0a0' }}>/mo</span>
          </div>
          <p style={{ color: '#a0a0a0' }} className="text-xs leading-relaxed">
            Range: ${data.rentRangeLow.toLocaleString()} – ${data.rentRangeHigh.toLocaleString()}/mo
            {prop?.propertyType && ` · ${prop.propertyType}`}
            {prop?.bedrooms != null && ` · ${prop.bedrooms}bd`}
            {prop?.bathrooms != null && `/${prop.bathrooms}ba`}
          </p>
          <p style={{ color: '#a0a0a0' }} className="text-xs flex items-center gap-1 -mb-1">
            Source: <a href="https://rentcast.io" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">Rentcast AVM</a>
          </p>
        </>
      )}

      {status === 'error' && (
        <p style={{ color: '#a0a0a0' }} className="text-xs">Cost of living data temporarily unavailable</p>
      )}
    </div>
  )
}

// ─── sub-components ──────────────────────────────────────────────────────────

function CompositeScoreBanner({ metrics }: { metrics: AddressMetrics }) {
  const score = computeCompositeScore(metrics)
  const color = scoreColor(score)
  const label = scoreLabel(score)
  const subtitle = compositeSubtitle(metrics)

  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-5"
      style={{ backgroundColor: '#1a1a1a', border: `1px solid ${color}40` }}
    >
      <div className="flex flex-col items-center justify-center shrink-0 w-20">
        <div className="text-5xl font-black leading-none" style={{ color }}>{score}</div>
        <div className="text-xs font-bold uppercase tracking-wide mt-1.5" style={{ color }}>{label}</div>
      </div>
      <div className="w-px self-stretch" style={{ backgroundColor: '#2a2a2a' }} />
      <div className="flex flex-col gap-1 min-w-0">
        <div className="text-white font-bold text-base leading-tight">Liveability Score</div>
        <div className="text-sm leading-snug" style={{ color: '#a0a0a0' }}>{subtitle}</div>
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon size={14} style={{ color: '#f97316' }} />
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#a0a0a0' }}>
        {label}
      </span>
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

export default function AddressResults({ metrics, updated }: AddressResultsProps) {
  const radius = metrics.radius ?? 800
  const places = metrics.places ?? EMPTY_PLACES
  const location = metrics.location ?? { lat: 0, lng: 0, formattedAddress: metrics.address ?? '' }
  const center = { lat: location.lat, lng: location.lng }

  // Community Snapshot data: prefer new censusData (has medianAge), fall back to legacy demographics
  const communityData = metrics.censusData ?? metrics.demographics
  const communityValue = communityData?.available && communityData.medianHouseholdIncome !== null
    ? `$${communityData.medianHouseholdIncome.toLocaleString()} median income`
    : 'Demographic data unavailable'
  const communityDesc = communityData?.available
    ? [
        communityData.totalPopulation !== null ? `Pop: ${communityData.totalPopulation.toLocaleString()}` : null,
        (communityData as { medianAge?: number | null }).medianAge != null ? `Median age: ${(communityData as { medianAge?: number | null }).medianAge}` : null,
      ].filter(Boolean).join(' · ') || undefined
    : undefined

  return (
    <div className="flex flex-col gap-5">
      {/* Composite score banner */}
      <CompositeScoreBanner metrics={metrics} />

      {/* Cost of Living */}
      <RentcastCostCard address={metrics.address ?? location.formattedAddress} />

      {/* Nearest Essentials */}
      {metrics.nearestEssentials && (
        <NearestEssentials
          data={metrics.nearestEssentials}
          metrics={metrics}
          center={center}
        />
      )}

      {/* Environment */}
      <div className="flex flex-col gap-3">
        <SectionHeader icon={Wind} label="Environment" />
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
            comparison={buildComparison('aqi', metrics)}
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
            icon={Leaf}
            radius={radius}
            places={places?.park}
            center={center}
            searchRadius={radius}
            detail={buildDetail('green', metrics)}
            comparison={buildComparison('green', metrics)}
            nearestEssentials={metrics.nearestEssentials}
          />
          <MetricCard
            label="Sunlight"
            value={metrics.sunlight?.available && metrics.sunlight.hoursPerYear !== null ? `${metrics.sunlight.hoursPerYear} hrs/yr` : NA}
            score={metrics.sunlight?.score ?? 0}
            description="Estimated annual rooftop sunshine"
            source="Google Solar API"
            updated={updated}
            metricKey="sunlight"
            icon={Sun}
            detail={buildDetail('sunlight', metrics)}
          />
          <MetricCard
            label="Noise Estimate"
            value={metrics.noise?.available && metrics.noise.level !== null ? metrics.noise.level : NA}
            score={metrics.noise?.score ?? 0}
            description="ESTIMATE based on nearby roads"
            source="OpenStreetMap (Overpass)"
            updated={updated}
            metricKey="noise"
            icon={Volume2}
            detail={buildDetail('noise', metrics)}
          />
        </div>
      </div>

      {/* Getting Around */}
      <div className="flex flex-col gap-3">
        <SectionHeader icon={Navigation} label="Getting Around" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            searchRadius={800}
            detail={buildDetail('transit', metrics)}
            comparison={buildComparison('transit', metrics)}
            nearestEssentials={metrics.nearestEssentials}
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
            comparison={buildComparison('walkability', metrics)}
            nearestEssentials={metrics.nearestEssentials}
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
            nearestEssentials={metrics.nearestEssentials}
          />
        </div>
      </div>

      {/* Daily Life */}
      <div className="flex flex-col gap-3">
        <SectionHeader icon={ShoppingBag} label="Daily Life" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            comparison={buildComparison('grocery', metrics)}
            nearestEssentials={metrics.nearestEssentials}
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
            comparison={buildComparison('dining', metrics)}
            nearestEssentials={metrics.nearestEssentials}
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
            comparison={buildComparison('school', metrics)}
            nearestEssentials={metrics.nearestEssentials}
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
            comparison={buildComparison('healthcare', metrics)}
            nearestEssentials={metrics.nearestEssentials}
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
            nearestEssentials={metrics.nearestEssentials}
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
            nearestEssentials={metrics.nearestEssentials}
          />
        </div>
      </div>

      {/* Safety & Community */}
      <div className="flex flex-col gap-3">
        <SectionHeader icon={Shield} label="Safety & Community" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            comparison={buildComparison('safety', metrics)}
          />
          <InfoCard
            label="Community Snapshot"
            value={communityValue}
            description={communityDesc}
            source="US Census Bureau (ACS)"
            updated={updated}
            metricKey="census"
            icon={Users}
            detail={buildDetail('census', metrics)}
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
            nearestEssentials={metrics.nearestEssentials}
          />
        </div>
      </div>

      <LocalNews query={metrics.address ?? location.formattedAddress} />
    </div>
  )
}
