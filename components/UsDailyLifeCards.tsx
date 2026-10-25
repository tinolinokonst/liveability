"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Footprints, Bus, School, ShoppingBasket, Wifi, HeartPulse } from 'lucide-react'
import MetricCard from './MetricCard'
import MetricInfoModal from './MetricInfoModal'
import { CardShell } from './RiskCards'
import { CardSkeleton, mi, NEUTRAL, ordinal, Row, SectionTitle, UnavailableCard } from './UsMetricCards'
import { METRIC_INFO } from '@/lib/metricInfo'
import { MUTED, pct, sviBand, UNAVAILABLE, walkCategory } from '@/lib/usMetrics'
import type {
  GeoLocation,
  NearestAmenity,
  UsBroadbandResult,
  UsFoodAccessResult,
  UsHealthResult,
  UsNearby,
  UsPlace,
  UsSchoolsResult,
  UsTransitResult,
  UsWalkabilityResult,
} from '@/lib/types'

const MetricInfoMap = dynamic(() => import('./MetricInfoMap'), { ssr: false })

type Center = { lat: number; lng: number }

function markersOf(places: UsPlace[]): NearestAmenity[] {
  return places.map(p => ({ name: p.name ?? p.kind, distanceKm: p.distanceKm, lat: p.lat, lng: p.lng, category: p.kind }))
}

/** The map for a physical amenity: what's in the radius, or the nearest one beyond it */
function NearbyMap({ center, nearby, noun, fromOsm }: { center: Center; nearby: UsNearby; noun: string; fromOsm: boolean }) {
  const outside = nearby.nearestOutside
  return (
    <MetricInfoMap
      basemap="us"
      center={center}
      centerLabel="This address"
      markers={markersOf(nearby.places)}
      markersFromOsm={fromOsm}
      searchRadiusMeters={nearby.radiusKm * 1000}
      nearestOutside={outside ? { lat: outside.lat, lng: outside.lng, name: outside.name ?? outside.kind, distanceKm: outside.distanceKm } : undefined}
      legend={[
        { color: '#f97316', label: 'This address' },
        ...(nearby.places.length ? [{ color: '#9ca3af', label: noun }] : []),
        ...(outside ? [{ color: '#ef4444', label: `Nearest ${noun.toLowerCase().replace(/s$/, '')}` }] : []),
      ]}
    />
  )
}

function PlaceList({ places, max = 10 }: { places: UsPlace[]; max?: number }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {places.slice(0, max).map(p => (
        <li key={`${p.lat},${p.lng},${p.name}`} className="flex items-baseline justify-between gap-3">
          <span className="min-w-0">
            {p.url ? (
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-white underline decoration-[#3a3a3a]">{p.name ?? p.kind}</a>
            ) : (
              <span className="text-white">{p.name ?? p.kind}</span>
            )}
            {p.name && <span className="text-xs" style={{ color: NEUTRAL }}> · {p.kind}</span>}
          </span>
          <span className="text-xs shrink-0">{mi(p.distanceKm)}</span>
        </li>
      ))}
    </ul>
  )
}

/** "None within 1 mi — the nearest is X, 3.2 mi away" */
function OutsideNote({ nearby, noun }: { nearby: UsNearby; noun: string }) {
  const o = nearby.nearestOutside
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs leading-relaxed" style={{ backgroundColor: '#2a2a2a' }}>
      No {noun} within {mi(nearby.radiusKm)}.{' '}
      {o
        ? <>The nearest is <strong className="text-white">{o.name ?? `a ${o.kind.toLowerCase()}`}</strong>, <strong className="text-white">{mi(o.distanceKm)}</strong> away.</>
        : 'None was found farther out either.'}
    </div>
  )
}

// ─── walkability ─────────────────────────────────────────────────────────────

function WalkabilityCard({ w }: { w: UsWalkabilityResult }) {
  const footer = 'Source: US EPA Smart Location Database'
  if (w.status !== 'ok' || w.index === null || w.score === null || !w.ranks) {
    return (
      <UnavailableCard
        icon={Footprints}
        label="Walkability"
        value={w.status === 'no_data' ? 'Not rated here' : UNAVAILABLE}
        sub={w.status === 'no_data' ? "EPA's index has no value for this block group." : 'Try again later.'}
        footer={footer}
      />
    )
  }
  const cat = walkCategory(w.index)
  const rankRows: Array<[string, number, string]> = [
    ['Street intersection density', w.ranks.intersectionDensity, 'More intersections mean shorter, more direct walks'],
    ['Proximity to transit', w.ranks.transitProximity, 'Distance from the block group to the nearest transit stop'],
    ['Mix of jobs', w.ranks.employmentMix, 'Shops, offices, services and more, side by side'],
    ['Mix of jobs and homes', w.ranks.employmentHousingMix, 'Places to work near places to live'],
  ]
  return (
    <MetricCard
      label="Walkability"
      icon={Footprints}
      value={`${w.index} / 20`}
      score={w.score}
      description={`${cat.label} · EPA index for this block group`}
      source="US EPA Smart Location Database"
      metricKey="usWalkability"
      detail={
        <>
          <p>
            <strong className="text-white">EPA rates this block group {w.index} out of 20: {cat.label.toLowerCase()}.</strong>
          </p>
          <ul className="flex flex-col gap-2">
            {rankRows.map(([label, rank, hint]) => (
              <li key={label} className="flex flex-col gap-0.5">
                <span className="flex items-baseline justify-between gap-3">
                  <span>{label}</span>
                  <span className="text-xs font-semibold text-white">{rank} / 20</span>
                </span>
                <span className="text-[11px]" style={{ color: NEUTRAL }}>{hint}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs">
            Each input is ranked 1–20 against every US block group (20 = most walkable); the index weights intersection
            density and transit proximity most. It measures layout, not sidewalks, crossings or safety.
            {w.blockGroup ? ` Block group ${w.blockGroup}.` : ''}
          </p>
        </>
      }
    />
  )
}

// ─── transit ─────────────────────────────────────────────────────────────────

function AgencyList({ t }: { t: UsTransitResult }) {
  return (
    <>
      <p className="text-white text-sm font-semibold pt-1">Agencies serving this area</p>
      {t.feedsStatus === 'ok' ? (
        <ul className="flex flex-col gap-1">
          {t.feeds.map(f => (
            <li key={f.id} className="text-xs">
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-white underline decoration-[#3a3a3a]">{f.provider}</a>
              {f.feedName && <span style={{ color: NEUTRAL }}> · {f.feedName}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs">
          {t.feedsStatus === 'no_data' ? 'No local transit schedules in the Mobility Database cover this location.' : 'Agency data is temporarily unavailable.'}
        </p>
      )}
    </>
  )
}

/** Stops unavailable (OpenStreetMap busy), but the agencies still say something */
function AgenciesOnlyCard({ t }: { t: UsTransitResult }) {
  const [open, setOpen] = useState(false)
  const n = t.feeds.length
  const value = `${n} transit agenc${n === 1 ? 'y' : 'ies'}`
  return (
    <>
      <CardShell
        icon={Bus}
        label="Transit"
        value={value}
        valueColor="white"
        sub={`${n === 1 ? 'Serves' : 'Serve'} this area · stop counts are temporarily unavailable`}
        footer="Source: Mobility Database · OpenStreetMap"
        onOpen={() => setOpen(true)}
      />
      {open && (
        <MetricInfoModal
          metricKey="usTransit"
          value={value}
          detail={<><p>Nearby stops from OpenStreetMap are temporarily unavailable — try again later.</p><AgencyList t={t} /></>}
          sources={METRIC_INFO.usTransit.sources}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function TransitCard({ t, center }: { t: UsTransitResult; center: Center }) {
  const agencies = t.feeds.length
  const agencyText = t.feedsStatus === 'ok' ? `${agencies} agenc${agencies === 1 ? 'y serves' : 'ies serve'} this area` : null

  if (t.status !== 'ok' || !t.stops || t.score === null) {
    if (t.feedsStatus === 'ok') return <AgenciesOnlyCard t={t} />
    return <UnavailableCard icon={Bus} label="Transit" footer="Source: OpenStreetMap · Mobility Database" />
  }
  const s = t.stops
  const description = s.count
    ? [`within ½ mi`, t.stationCount ? `${t.stationCount} rail station${t.stationCount === 1 ? '' : 's'}` : null, agencyText].filter(Boolean).join(' · ')
    : s.nearestOutside ? `None within ½ mi · nearest ${mi(s.nearestOutside.distanceKm)} away` : 'None within ½ mi'

  return (
    <MetricCard
      label="Transit"
      icon={Bus}
      value={`${s.count} stop${s.count === 1 ? '' : 's'}`}
      score={t.score}
      description={description}
      source="OpenStreetMap · Mobility Database"
      metricKey="usTransit"
      sources={METRIC_INFO.usTransit.sources}
      detail={
        <>
          {s.count ? (
            <>
              <p><strong className="text-white">{s.count} public transport stops within half a mile{t.stationCount ? `, ${t.stationCount} of them rail stations` : ''}.</strong></p>
              <PlaceList places={s.places} max={8} />
            </>
          ) : <OutsideNote nearby={s} noun="transit stops" />}
          <AgencyList t={t} />
          <p className="text-xs">
            The score counts stops (10 or more within half a mile is full marks), not how often vehicles come. Agencies are
            those whose published schedules cover this location; intercity services such as Amtrak aren&apos;t listed.
          </p>
        </>
      }
      map={<NearbyMap center={center} nearby={s} noun="Transit stops" fromOsm />}
    />
  )
}

// ─── schools ─────────────────────────────────────────────────────────────────

function SchoolsCard({ r, center }: { r: UsSchoolsResult; center: Center }) {
  const [open, setOpen] = useState(false)
  const footer = 'Source: NCES EDGE school locations'
  if (r.status !== 'ok' || !r.schools) return <UnavailableCard icon={School} label="Schools" footer={footer} />

  const s = r.schools
  const nearest = s.places[0] ?? s.nearestOutside
  const value = s.count ? `${s.count} school${s.count === 1 ? '' : 's'} within 1 mi` : 'None within 1 mi'
  const sub = nearest ? `Nearest: ${nearest.name ?? nearest.kind} · ${mi(nearest.distanceKm)}` : 'No school found within 25 miles.'
  const years = [r.publicYear && `public ${r.publicYear}`, r.privateYear && `private ${r.privateYear}`].filter(Boolean).join(', ')

  return (
    <>
      <CardShell icon={School} label="Schools" value={value} valueColor={s.count ? 'white' : MUTED} sub={sub} footer={footer} onOpen={() => setOpen(true)} />
      {open && (
        <MetricInfoModal
          metricKey="usSchools"
          value={value}
          detail={
            <>
              {s.count ? (
                <>
                  <p>
                    <strong className="text-white">
                      {s.count} public and private school{s.count === 1 ? '' : 's'} within a mile
                      {s.count > s.places.length ? `; the nearest ${s.places.length} are listed` : ''}.
                    </strong>
                  </p>
                  <PlaceList places={s.places} max={25} />
                </>
              ) : <OutsideNote nearby={s} noun="schools" />}
              <p className="text-xs">
                Nearby doesn&apos;t mean assigned: public school places depend on the district&apos;s attendance zones.
                {years ? ` School years: ${years}.` : ''}
              </p>
            </>
          }
          map={<NearbyMap center={center} nearby={s} noun="Schools" fromOsm={false} />}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── food access ─────────────────────────────────────────────────────────────

function usdaLine(u: NonNullable<UsFoodAccessResult['usda']>): { text: string; flagged: boolean } {
  if (u.lila1And10) return { text: 'USDA: low-income, low-access tract', flagged: true }
  if (u.lowAccess1And10) return { text: `USDA: many residents live over ${u.urban ? '1 mile' : '10 miles'} from a supermarket`, flagged: true }
  return { text: 'USDA: not a low-access tract', flagged: false }
}

function FoodCard({ f, center }: { f: UsFoodAccessResult; center: Center }) {
  const [open, setOpen] = useState(false)
  const footer = 'Source: OpenStreetMap · USDA Food Access Research Atlas'
  const usda = f.usdaStatus === 'ok' && f.usda ? usdaLine(f.usda) : null
  if ((f.groceryStatus !== 'ok' || !f.grocery) && !usda) return <UnavailableCard icon={ShoppingBasket} label="Food Access" footer={footer} />

  const g = f.grocery
  const value = g ? (g.count ? `${g.count} grocery store${g.count === 1 ? '' : 's'} within 1 mi` : 'None within 1 mi') : 'Store data unavailable'
  const color = usda?.flagged ? '#f97316' : g && g.count ? '#22c55e' : g ? '#f59e0b' : MUTED
  const sub = [
    g && !g.count && g.nearestOutside ? `Nearest ${mi(g.nearestOutside.distanceKm)} away` : null,
    usda?.text ?? (f.usdaStatus === 'error' ? 'USDA data temporarily unavailable' : null),
  ].filter(Boolean).join(' · ')

  return (
    <>
      <CardShell icon={ShoppingBasket} label="Food Access" value={value} valueColor={color} sub={sub} footer={footer} onOpen={() => setOpen(true)} />
      {open && (
        <MetricInfoModal
          metricKey="usFood"
          value={value}
          detail={
            <>
              {g ? (
                g.count ? (
                  <>
                    <p><strong className="text-white">{g.count === 1 ? 'One supermarket or grocery store' : `${g.count} supermarkets and grocery stores`} within a mile, mapped in OpenStreetMap.</strong></p>
                    <PlaceList places={g.places} max={10} />
                  </>
                ) : <OutsideNote nearby={g} noun="supermarkets or grocery stores" />
              ) : <p>Store data from OpenStreetMap is temporarily unavailable.</p>}
              <p className="text-white text-sm font-semibold pt-1">USDA Food Access Research Atlas</p>
              {f.usda ? (
                <ul className="flex flex-col gap-1.5">
                  <Row label="Low income and low access (1 mi urban / 10 mi rural)" value={f.usda.lila1And10 ? 'Yes' : 'No'} color={f.usda.lila1And10 ? '#f97316' : '#22c55e'} />
                  <Row label="Low access (1 mi urban / 10 mi rural)" value={f.usda.lowAccess1And10 ? 'Yes' : 'No'} color={f.usda.lowAccess1And10 ? '#f97316' : '#22c55e'} />
                  <Row label="Low access at ½ mile, low income" value={f.usda.lilaHalfAnd10 ? 'Yes' : 'No'} color={f.usda.lilaHalfAnd10 ? '#eab308' : '#22c55e'} />
                  <Row label="Low-income tract" value={f.usda.lowIncome ? 'Yes' : 'No'} />
                  <Row label="Tract type" value={f.usda.urban ? 'Urban' : 'Rural'} />
                </ul>
              ) : (
                <p className="text-xs">{f.usdaStatus === 'no_data' ? 'The atlas has no record for this tract.' : 'Temporarily unavailable.'}</p>
              )}
              <p className="text-xs">
                USDA flags a tract as low-access when at least 500 people, or a third of residents, live farther than the
                distance from the nearest supermarket. OpenStreetMap may miss some stores.
                {f.usda ? ` Census tract ${f.usda.tract}.` : ''}
              </p>
            </>
          }
          map={g ? <NearbyMap center={center} nearby={g} noun="Grocery stores" fromOsm /> : undefined}
          sources={METRIC_INFO.usFood.sources}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── broadband ───────────────────────────────────────────────────────────────

function BroadbandCard({ b }: { b: UsBroadbandResult }) {
  const [open, setOpen] = useState(false)
  const footer = 'Source: FCC National Broadband Map'
  if (b.status !== 'ok' || !b.figures) {
    return (
      <UnavailableCard
        icon={Wifi}
        label="Broadband"
        value={b.status === 'no_data' ? 'No data for this county' : UNAVAILABLE}
        sub={b.status === 'no_data' ? "The FCC's county figures don't include this county." : 'Try again later.'}
        footer={footer}
      />
    )
  }
  const f = b.figures
  const where = `${b.county}${b.area === 'total' ? '' : ` (${b.area} part)`}`
  const color = f.wired100 >= 0.9 ? '#22c55e' : f.wired100 >= 0.6 ? '#f59e0b' : '#ef4444'
  const value = `${pct(f.wired1000)} of homes: gigabit`

  return (
    <>
      <CardShell
        icon={Wifi}
        label="Broadband"
        value={value}
        valueColor={color}
        sub={`${pct(f.wired100)} can get 100/20 Mbps by wire · ${where}`}
        footer={`${footer} · area figure, not this address`}
        onOpen={() => setOpen(true)}
      />
      {open && (
        <MetricInfoModal
          metricKey="broadband"
          value={value}
          detail={
            <>
              <p>
                <strong className="text-white">
                  Across {f.units.toLocaleString('en-US')} homes in {where}, providers report this home internet availability:
                </strong>
              </p>
              <ul className="flex flex-col gap-1.5">
                <Row label="100/20 Mbps or faster, by wire" value={pct(f.wired100)} />
                <Row label="1 Gbps (1000/100) or faster, by wire" value={pct(f.wired1000)} />
                <Row label="Fiber to the home" value={pct(f.fiber100)} />
                <Row label="100/20 Mbps incl. fixed wireless" value={pct(f.terrestrial100)} />
              </ul>
              <p className="text-xs">
                &quot;By wire&quot; is cable, fiber or copper. Satellite is left out: it reaches nearly every home, so it
                would make everywhere look fully served. These are reported availability, not measured speeds, as of{' '}
                {b.asOf}.
              </p>
              <p className="text-xs">
                <a href="https://broadbandmap.fcc.gov/home" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#f97316' }}>
                  Check this exact address on the FCC map
                </a>
              </p>
            </>
          }
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── health ──────────────────────────────────────────────────────────────────

function HealthCard({ h }: { h: UsHealthResult }) {
  const [open, setOpen] = useState(false)
  const footer = 'Source: CDC PLACES · CDC/ATSDR SVI'
  if (h.placesStatus !== 'ok' && h.sviStatus !== 'ok') {
    return <UnavailableCard icon={HeartPulse} label="Community Health" footer={footer} />
  }
  const band = h.svi ? sviBand(h.svi.overall) : null
  const uninsured = h.measures.find(m => m.id === 'ACCESS2')
  const value = band ? band.label : 'Health estimates'
  const sub = [
    h.svi ? `Social Vulnerability Index: ${ordinal(h.svi.overall * 100)} percentile` : 'Social Vulnerability Index unavailable',
    uninsured?.tract != null ? `uninsured ${uninsured.tract} %${uninsured.county != null ? ` (county ${uninsured.county} %)` : ''}` : null,
  ].filter(Boolean).join(' · ')

  const themes: Array<[string, number | null]> = h.svi ? [
    ['Socioeconomic status', h.svi.socioeconomic],
    ['Household characteristics', h.svi.household],
    ['Racial and ethnic minority status', h.svi.minority],
    ['Housing type and transportation', h.svi.housing],
  ] : []

  return (
    <>
      <CardShell icon={HeartPulse} label="Community Health" value={value} valueColor={band?.color ?? 'white'} sub={sub} footer={footer} onOpen={() => setOpen(true)} />
      {open && (
        <MetricInfoModal
          metricKey="usHealth"
          value={value}
          detail={
            <>
              {h.svi && band ? (
                <>
                  <p>
                    <strong className="text-white">
                      This census tract ranks in the {ordinal(h.svi.overall * 100)} percentile of social vulnerability: {band.label.toLowerCase()}.
                    </strong>
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {themes.map(([label, v]) => (
                      <Row key={label} label={label} value={v === null ? '—' : `${ordinal(v * 100)} percentile`} color={v === null ? NEUTRAL : sviBand(v).color} />
                    ))}
                  </ul>
                  <p className="text-xs">
                    Percentiles compare this tract with every US tract (higher = more vulnerable). The index describes the
                    community&apos;s capacity to cope with emergencies, not any household.
                  </p>
                </>
              ) : <p>The Social Vulnerability Index is {h.sviStatus === 'no_data' ? 'not available for this tract' : 'temporarily unavailable'}.</p>}

              <p className="text-white text-sm font-semibold pt-1">Adult health estimates (CDC PLACES)</p>
              {h.measures.length ? (
                <ul className="flex flex-col gap-1.5">
                  <li className="flex justify-between gap-3 text-[11px]" style={{ color: NEUTRAL }}>
                    <span>Share of adults</span><span>Tract · County</span>
                  </li>
                  {h.measures.map(m => {
                    const worse = m.county != null && m.tract != null && (m.higherIsBetter ? m.tract < m.county - 2 : m.tract > m.county + 2)
                    const better = m.county != null && m.tract != null && (m.higherIsBetter ? m.tract > m.county + 2 : m.tract < m.county - 2)
                    return (
                      <Row
                        key={m.id}
                        label={<span className="text-xs">{m.label}</span>}
                        value={`${m.tract} %${m.county != null ? ` · ${m.county} %` : ''}`}
                        color={worse ? '#f97316' : better ? '#22c55e' : 'white'}
                      />
                    )
                  })}
                </ul>
              ) : <p className="text-xs">{h.placesStatus === 'no_data' ? 'PLACES has no estimates for this tract.' : 'Temporarily unavailable.'}</p>}
              <p className="text-xs">
                PLACES figures are model-based estimates ({h.placesYear ?? 'latest release'}) from national survey data, not counts.
                Orange: more than 2 points worse than the county; green: more than 2 points better.
                {h.tract ? ` Census tract ${h.tract}.` : ''}
              </p>
            </>
          }
          sources={METRIC_INFO.usHealth.sources}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── section ─────────────────────────────────────────────────────────────────

type DailyData = Partial<{
  walk: UsWalkabilityResult
  transit: UsTransitResult
  schools: UsSchoolsResult
  food: UsFoodAccessResult
  broadband: UsBroadbandResult
  health: UsHealthResult
}>

/** Mobility and daily-life cards for a US address; each renders as soon as its source answers */
export function UsDailyLifeSection({ data, location }: { data: DailyData; location: GeoLocation }) {
  const center = { lat: location.lat, lng: location.lng }
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Getting around &amp; daily life</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.walk ? <WalkabilityCard w={data.walk} /> : <CardSkeleton />}
        {data.transit ? <TransitCard t={data.transit} center={center} /> : <CardSkeleton />}
        {data.schools ? <SchoolsCard r={data.schools} center={center} /> : <CardSkeleton />}
        {data.food ? <FoodCard f={data.food} center={center} /> : <CardSkeleton />}
        {data.broadband ? <BroadbandCard b={data.broadband} /> : <CardSkeleton />}
        {data.health ? <HealthCard h={data.health} /> : <CardSkeleton />}
      </div>
    </div>
  )
}
