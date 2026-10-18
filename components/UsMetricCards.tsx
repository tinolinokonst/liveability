"use client"

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Wind, CloudSun, Volume2, Sun, Waves, ShieldAlert, Flame, FlaskConical, TriangleAlert } from 'lucide-react'
import MetricCard from './MetricCard'
import MetricInfoModal from './MetricInfoModal'
import { CardShell, NoteBox } from './RiskCards'
import type { LegendItem } from './MetricInfoMap'
import { aqiColor, METRIC_INFO } from '@/lib/metricInfo'
import { formatDistanceFor } from '@/lib/country'
import { environmentProvidersFor } from '@/lib/providers'
import {
  EPA_KIND_INFO,
  FLOOD_RISK_INFO,
  formatBurnProbability,
  HEAT_RISK_INFO,
  MUTED,
  NOISE_BAND_LABEL,
  noiseLevel,
  NRI_RATING_COLOR,
  POLLUTANT_LABEL,
  UNAVAILABLE,
  US_RISK_NOTE,
} from '@/lib/usMetrics'
import type {
  EpaSiteKind,
  GeoLocation,
  NearestAmenity,
  NriArea,
  UsAirQualityResult,
  UsEpaSitesResult,
  UsFloodResult,
  UsNoiseResult,
  UsNriResult,
  UsRisksResult,
  UsSunlightResult,
  UsWeatherResult,
  UsWildfireResult,
} from '@/lib/types'

const MetricInfoMap = dynamic(() => import('./MetricInfoMap'), { ssr: false })

const NEUTRAL = '#6b6b6b'
const mi = (km: number | null | undefined) => formatDistanceFor(km, 'US')

type Center = { lat: number; lng: number }


function Row({ label, value, color }: { label: React.ReactNode; value: React.ReactNode; color?: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span>{label}</span>
      <span className="text-xs font-semibold text-right" style={{ color: color ?? 'white' }}>{value}</span>
    </li>
  )
}

/** The muted card every metric falls back to when its source couldn't answer */
function UnavailableCard({ icon, label, value = UNAVAILABLE, sub = 'Try again later.', footer }: {
  icon: typeof Wind; label: string; value?: string; sub?: string; footer: string
}) {
  return <CardShell icon={icon} label={label} value={value} valueColor={MUTED} sub={sub} footer={footer} />
}

// ─── air quality ─────────────────────────────────────────────────────────────

function AirQualityCard({ a, center }: { a: UsAirQualityResult; center: Center }) {
  const footer = 'Source: AirNow · EPA AQS'
  if (a.status !== 'ok' || a.aqi === null || a.category === null || a.score === null) {
    return (
      <UnavailableCard
        icon={Wind}
        label="Air Quality"
        value={a.status === 'no_data' ? 'No monitor nearby' : UNAVAILABLE}
        sub={a.message ?? 'Try again later.'}
        footer={footer}
      />
    )
  }

  const markers: NearestAmenity[] = [
    ...a.readings.filter(r => r.lat !== undefined && r.lng !== undefined).map(r => ({
      name: r.siteName,
      distanceKm: r.distanceKm ?? 0,
      lat: r.lat,
      lng: r.lng,
      category: `${r.pollutant} · AQI ${r.aqi} now`,
    })),
    ...a.annual.pollutants.map(p => ({
      name: p.siteName,
      distanceKm: p.distanceKm,
      lat: p.lat,
      lng: p.lng,
      category: `${POLLUTANT_LABEL[p.pollutant].name} · ${a.annual.year} annual`,
    })),
  ]

  return (
    <MetricCard
      label="Air Quality (AQI)"
      icon={Wind}
      value={String(a.aqi)}
      score={a.score}
      description={`${a.category} · current hour, preliminary`}
      source="AirNow · EPA AQS"
      metricKey="usAqi"
      sources={METRIC_INFO.usAqi.sources}
      detail={
        <>
          <p>
            <strong className="text-white">Current AQI {a.aqi} ({a.category})</strong>
            {a.observedAt && <> — observed {a.observedAt}</>}
            {a.reportingArea && <>, {a.reportingArea} reporting area</>}.
          </p>
          <ul className="flex flex-col gap-1.5">
            {a.readings.map(r => (
              <Row
                key={r.pollutant}
                label={<>{r.pollutant} <span className="text-xs" style={{ color: NEUTRAL }}>· {r.siteName}{r.distanceKm !== null ? `, ${mi(r.distanceKm)}` : ''}</span></>}
                value={`AQI ${r.aqi} · ${r.category}`}
                color={aqiColor(r.category)}
              />
            ))}
          </ul>
          <p className="text-xs">
            AirNow readings are preliminary, unvalidated hourly data from the closest monitor for each pollutant.
            They change through the day; the annual figures below are the validated record.
          </p>
          <p className="text-white text-sm font-semibold pt-1">
            Annual context{a.annual.year ? ` (${a.annual.year}, EPA AQS)` : ''}
          </p>
          {a.annual.status === 'ok' ? (
            <ul className="flex flex-col gap-1.5">
              {a.annual.pollutants.map(p => {
                const ratio = p.value / p.standard
                return (
                  <Row
                    key={p.pollutant}
                    label={<>
                      {POLLUTANT_LABEL[p.pollutant].name} <span className="text-xs" style={{ color: NEUTRAL }}>{POLLUTANT_LABEL[p.pollutant].stat} · {p.siteName}, {mi(p.distanceKm)}</span>
                    </>}
                    value={`${p.value < 1 ? p.value.toFixed(3) : p.value.toFixed(1)} ${p.unit} · ${Math.round(ratio * 100)} % of standard`}
                    color={ratio > 1 ? '#ef4444' : ratio > 0.8 ? '#eab308' : '#22c55e'}
                  />
                )
              })}
            </ul>
          ) : (
            <p className="text-xs">
              {a.annual.status === 'no_data'
                ? 'No validated annual data from an AQS monitor within 25 miles.'
                : 'Annual data are temporarily unavailable.'}
            </p>
          )}
          <p className="text-xs">
            Standards: PM2.5 annual mean 9.0 µg/m³ (2024), ozone 0.070 ppm (2015), NO₂ annual mean 53 ppb.
            The ozone figure is one year&apos;s 4th-highest day, not the official three-year design value.
          </p>
        </>
      }
      map={
        <MetricInfoMap
          basemap="us"
          center={center}
          centerLabel="This address"
          markers={markers}
          markersFromOsm={false}
          legend={[{ color: '#f97316', label: 'This address' }, ...(markers.length ? [{ color: '#9ca3af', label: 'Air monitor' }] : [])]}
        />
      }
    />
  )
}

// ─── weather alerts and heat ─────────────────────────────────────────────────

function formatEnds(iso: string | null): string {
  if (!iso) return 'until further notice'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `until ${d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`
}

function WeatherCard({ w }: { w: UsWeatherResult }) {
  const [open, setOpen] = useState(false)
  const footer = 'Source: National Weather Service'
  if (w.alertsStatus === 'error' && w.heatStatus === 'error') {
    return <UnavailableCard icon={CloudSun} label="Weather Alerts & Heat" footer={footer} />
  }

  const heat = w.heatRiskMax !== null ? HEAT_RISK_INFO[w.heatRiskMax] : null
  const value =
    w.alertsStatus === 'error' ? 'Alerts unavailable'
    : w.alerts.length === 0 ? 'No active alerts'
    : `${w.alerts.length} active alert${w.alerts.length === 1 ? '' : 's'}`
  const color = w.alertsStatus !== 'ok' ? MUTED : w.alerts.length ? '#f97316' : '#22c55e'
  const sub = [
    w.alerts.length ? w.alerts.map(a => a.event).slice(0, 2).join(' · ') : null,
    heat ? `HeatRisk next 7 days: ${heat.label.toLowerCase()}` : w.heatStatus === 'error' ? 'HeatRisk unavailable' : 'No HeatRisk forecast here',
  ].filter(Boolean).join(' · ')

  return (
    <>
      <CardShell icon={CloudSun} label="Weather Alerts & Heat" value={value} valueColor={color} sub={sub} footer={footer} onOpen={() => setOpen(true)} />
      {open && (
        <MetricInfoModal
          metricKey="weather"
          value={value}
          detail={
            <>
              {w.alertsStatus === 'ok' && w.alerts.length === 0 && (
                <p><strong className="text-white">The National Weather Service has no active alerts for this location.</strong></p>
              )}
              {w.alertsStatus === 'error' && <p>Active alerts are temporarily unavailable.</p>}
              {w.alerts.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {w.alerts.map((a, i) => (
                    <li key={`${a.event}-${i}`} className="rounded-xl px-3 py-2.5 flex flex-col gap-0.5" style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}>
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-white text-sm font-semibold">{a.event}</span>
                        <span className="text-xs shrink-0">{a.severity}</span>
                      </span>
                      {a.headline && <span className="text-xs">{a.headline}</span>}
                      <span className="text-[11px]" style={{ color: NEUTRAL }}>{a.sender} · {formatEnds(a.ends)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-white text-sm font-semibold pt-1">Heat</p>
              {heat && w.heatRiskMax !== null ? (
                <ul className="flex flex-col gap-1.5">
                  {w.heatRiskToday !== null && (
                    <Row label="HeatRisk today" value={`${w.heatRiskToday} · ${HEAT_RISK_INFO[w.heatRiskToday].label}`} color={HEAT_RISK_INFO[w.heatRiskToday].color} />
                  )}
                  <Row label="Highest HeatRisk, next 7 days" value={`${w.heatRiskMax} · ${heat.label}`} color={heat.color} />
                  {w.maxTempF !== null && <Row label="Highest forecast temperature" value={`${w.maxTempF} °F`} />}
                </ul>
              ) : (
                <p className="text-xs">{w.heatStatus === 'error' ? 'The heat forecast is temporarily unavailable.' : 'NWS publishes no HeatRisk forecast for this location.'}</p>
              )}
              {heat && <p className="text-xs">{heat.meaning}. HeatRisk compares forecast heat with what is usual here at this time of year.</p>}
              <p className="text-xs">
                <a href={w.forecastUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#f97316' }}>
                  Full NWS forecast for this location
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

// ─── noise ───────────────────────────────────────────────────────────────────

function NoiseCard({ n }: { n: UsNoiseResult }) {
  if (n.status !== 'ok' || !n.band || n.score === null) {
    return <UnavailableCard icon={Volume2} label="Transportation Noise" sub={n.message ?? 'Try again later.'} footer="Source: BTS National Transportation Noise Map" />
  }
  const modeLabel = { road: 'Road', rail: 'Rail', aviation: 'Aviation' } as const
  return (
    <MetricCard
      label="Transportation Noise"
      icon={Volume2}
      value={NOISE_BAND_LABEL[n.band]}
      score={n.score}
      description={`${noiseLevel(n.score)} · modeled 24-hour average, road + rail + aviation`}
      source="BTS National Transportation Noise Map (2020)"
      metricKey="usNoise"
      detail={
        <>
          <p>
            <strong className="text-white">Modeled transportation noise here: {NOISE_BAND_LABEL[n.band]}</strong> (24-hour LAeq, an average day in 2020).
          </p>
          <ul className="flex flex-col gap-1.5">
            {(Object.keys(modeLabel) as Array<keyof typeof modeLabel>).map(m => (
              <Row
                key={m}
                label={modeLabel[m]}
                value={n.modes[m] ? NOISE_BAND_LABEL[n.modes[m]!] : 'Not modeled here'}
                color={n.modes[m] ? 'white' : NEUTRAL}
              />
            ))}
          </ul>
          <p className="text-xs">
            An estimate, not a measurement: the map models traffic, trains and flights, and leaves out levels below
            45 dBA and local sources such as construction or nightlife. BTS publishes it for tracking potential
            exposure, not for judging a single building.
          </p>
        </>
      }
    />
  )
}

// ─── sunlight ────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function SunlightCard({ s }: { s: UsSunlightResult }) {
  if (s.status !== 'ok' || s.ghi === null || s.score === null) {
    return (
      <UnavailableCard
        icon={Sun}
        label="Sunlight"
        value={s.status === 'no_data' ? 'Not available here' : UNAVAILABLE}
        sub={s.message ?? 'Try again later.'}
        footer="Source: NLR National Solar Radiation Database"
      />
    )
  }
  const peak = Math.max(...(s.monthlyGhi ?? [s.ghi]))
  return (
    <MetricCard
      label="Sunlight"
      icon={Sun}
      value={`${s.ghi.toFixed(2)} kWh/m²`}
      score={s.score}
      description="Per day, long-term average · area estimate (not this building)"
      source="NLR (formerly NREL) solar resource data"
      metricKey="usSunlight"
      detail={
        <>
          <p>
            <strong className="text-white">{s.ghi.toFixed(2)} kWh/m² of sunlight a day</strong> on average reaches flat ground in
            the ~4 km area around this address — about {s.ghi.toFixed(1)} peak sun hours.
            {s.latTilt !== null && <> A panel tilted at the latitude gets about {s.latTilt.toFixed(2)}.</>}
          </p>
          {s.monthlyGhi && (
            <ul className="flex flex-col gap-1">
              {s.monthlyGhi.map((v, i) => (
                <li key={MONTH_LABELS[i]} className="flex items-center gap-2 text-xs">
                  <span className="w-8 shrink-0">{MONTH_LABELS[i]}</span>
                  <span className="h-1.5 rounded-full" style={{ width: `${(v / peak) * 70}%`, backgroundColor: '#eab308' }} />
                  <span className="text-white">{v.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs">
            Climate, not shading: nearby buildings, trees and orientation aren&apos;t included. The score spans the US
            range, from about 3.4 kWh/m² a day in Seattle (low) to 5.8 in Phoenix (high).
          </p>
        </>
      }
    />
  )
}

// ─── flood zone ──────────────────────────────────────────────────────────────

function FloodCard({ f, address }: { f: UsFloodResult; address: string }) {
  const [open, setOpen] = useState(false)
  const footer = 'Source: FEMA National Flood Hazard Layer'
  if (f.status === 'error') return <UnavailableCard icon={Waves} label="Flood Zone" footer={footer} />
  if (f.status === 'no_data' || !f.risk || !f.zone) {
    return (
      <UnavailableCard
        icon={Waves}
        label="Flood Zone"
        value="No digital flood map here"
        sub="FEMA's National Flood Hazard Layer doesn't cover this point — no statement either way. Check the Flood Map Service Center."
        footer={footer}
      />
    )
  }
  const info = FLOOD_RISK_INFO[f.risk]
  const value = `${info.label} · Zone ${f.zone}`
  return (
    <>
      <CardShell
        icon={Waves}
        label="Flood Zone"
        value={value}
        valueColor={info.color}
        sub={f.sfha ? 'In the Special Flood Hazard Area (1%-annual-chance floodplain)' : 'Outside the Special Flood Hazard Area'}
        footer={US_RISK_NOTE}
        onOpen={() => setOpen(true)}
      />
      {open && (
        <MetricInfoModal
          metricKey="flood"
          value={value}
          detail={
            <>
              <p><strong className="text-white">This address is in FEMA flood zone {f.zone}{f.subtype ? ` (${f.subtype.toLowerCase()})` : ''}.</strong></p>
              <ul className="flex flex-col gap-1.5">
                <Row label="Special Flood Hazard Area" value={f.sfha ? 'Yes' : 'No'} color={f.sfha ? '#ef4444' : '#22c55e'} />
                {f.bfeFt !== null && <Row label="Base flood elevation" value={`${f.bfeFt} ft`} />}
                {f.firmPanel && <Row label="FIRM panel" value={f.firmPanel} />}
                {f.effectiveDate && <Row label="Map effective since" value={f.effectiveDate} />}
              </ul>
              <p className="text-xs">{info.meaning}</p>
              <p className="text-xs">
                <a href={`https://msc.fema.gov/portal/search?AddressQuery=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#f97316' }}>
                  See the official flood map at FEMA&apos;s Map Service Center
                </a>
              </p>
              <NoteBox text={US_RISK_NOTE} />
            </>
          }
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── National Risk Index ─────────────────────────────────────────────────────

function ordinal(n: number): string {
  const r = Math.round(n)
  const suffix = r % 100 >= 11 && r % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[r % 10] ?? 'th'
  return `${r}${suffix}`
}

function NriBlock({ area, title }: { area: NriArea; title: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-white text-sm font-semibold">{title}: {area.name}</p>
      <ul className="flex flex-col gap-1.5">
        <Row label="Overall risk" value={`${area.rating}${area.score !== null ? ` · ${ordinal(area.score)} percentile` : ''}`} color={NRI_RATING_COLOR[area.rating]} />
        {area.topHazards.map(h => (
          <Row key={h.key} label={<span className="text-xs">{h.label}</span>} value={h.rating} color={NRI_RATING_COLOR[h.rating]} />
        ))}
      </ul>
    </div>
  )
}

function NriCard({ n }: { n: UsNriResult }) {
  const [open, setOpen] = useState(false)
  const footer = 'Source: FEMA National Risk Index'
  const area = n.tract ?? n.county
  if (n.status === 'error') return <UnavailableCard icon={ShieldAlert} label="National Risk Index" footer={footer} />
  if (!area) return <UnavailableCard icon={ShieldAlert} label="National Risk Index" value="No rating here" sub="The National Risk Index has no tract or county rating for this location." footer={footer} />
  const top = area.topHazards.slice(0, 2).map(h => `${h.label} (${h.rating.toLowerCase()})`).join(' · ')
  return (
    <>
      <CardShell
        icon={ShieldAlert}
        label="Natural Hazard Risk"
        value={area.rating}
        valueColor={NRI_RATING_COLOR[area.rating]}
        sub={`${n.tract ? 'Census tract' : 'County'} composite${top ? ` · top: ${top}` : ''}`}
        footer={footer}
        onOpen={() => setOpen(true)}
      />
      {open && (
        <MetricInfoModal
          metricKey="nri"
          value={area.rating}
          detail={
            <>
              <p>
                <strong className="text-white">FEMA rates the overall natural hazard risk of this census tract as {area.rating.toLowerCase()}</strong>,
                relative to all US tracts. The highest-rated hazards are listed below.
              </p>
              {n.tract && <NriBlock area={n.tract} title="Census tract" />}
              {n.county && <NriBlock area={n.county} title="County" />}
              <p className="text-xs">
                A rating describes the whole tract or county — expected losses to buildings, people and agriculture,
                adjusted for social vulnerability and resilience — not this property.{n.version ? ` NRI version: ${n.version}.` : ''}
              </p>
              <NoteBox text={US_RISK_NOTE} />
            </>
          }
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── wildfire ────────────────────────────────────────────────────────────────

function WildfireCard({ w }: { w: UsWildfireResult }) {
  const [open, setOpen] = useState(false)
  const footer = 'Source: USDA Forest Service · FEMA NRI'
  const rated = w.nriRating && !['No Rating', 'Not Applicable', 'Insufficient Data'].includes(w.nriRating)
  const ratingText = w.nriRating ? `FEMA tract rating: ${rated ? w.nriRating.toLowerCase() : 'not rated'}` : null

  if (w.status !== 'ok' || w.burnProbability === null) {
    // FEMA's tract rating can still be shown on its own, clearly labelled
    return (
      <UnavailableCard
        icon={Flame}
        label="Wildfire"
        value={w.status === 'no_data' ? 'No likelihood value here' : 'Likelihood unavailable'}
        sub={[w.status === 'no_data' ? 'Wildfire Risk to Communities has no value for this location.' : 'The Forest Service map is temporarily unavailable.', ratingText].filter(Boolean).join(' · ')}
        footer={footer}
      />
    )
  }
  const value = formatBurnProbability(w.burnProbability)
  return (
    <>
      <CardShell
        icon={Flame}
        label="Wildfire"
        value={value.split(' (')[0]}
        // No colour scale: the Forest Service publishes likelihood without one,
        // and borrowing FEMA's rating colour would attribute it to the wrong number
        valueColor="white"
        sub={['Annual chance a wildfire burns here', ratingText].filter(Boolean).join(' · ')}
        footer={footer}
        onOpen={() => setOpen(true)}
      />
      {open && (
        <MetricInfoModal
          metricKey="wildfire"
          value={value.split(' (')[0]}
          detail={
            <>
              <p><strong className="text-white">Wildfire likelihood here: {value}.</strong></p>
              <ul className="flex flex-col gap-1.5">
                <Row label="Annual burn probability (~30 m cell)" value={value.split(' (')[0]} />
                {w.nriRating && <Row label="FEMA National Risk Index, tract wildfire rating" value={w.nriRating} color={NRI_RATING_COLOR[w.nriRating]} />}
              </ul>
              <p className="text-xs">
                Modeled from fuels, weather and terrain by the USDA Forest Service. Likelihood says nothing about how
                intense a fire would be or how a particular home would fare; ember exposure and defensible space matter too.
              </p>
              <NoteBox text={US_RISK_NOTE} />
            </>
          }
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── EPA sites ───────────────────────────────────────────────────────────────

const KIND_ORDER: EpaSiteKind[] = ['superfund_npl', 'superfund', 'brownfield', 'tri']

/** EPA's all-caps status wording, readable, keeping its acronyms */
function sentenceCase(text: string): string {
  const lower = text.toLowerCase().replace(/\b(npl|epa|rcra|tri)\b/g, m => m.toUpperCase())
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function EpaSitesCard({ e, center }: { e: UsEpaSitesResult; center: Center }) {
  const [open, setOpen] = useState(false)
  const footer = 'Source: US EPA Facility Registry Service (Envirofacts)'
  if (e.status !== 'ok') return <UnavailableCard icon={FlaskConical} label="EPA-Listed Sites" footer={footer} />

  const radius = `${e.radiusMiles} mi`
  const worst = KIND_ORDER.find(k => e.counts[k] > 0)
  const value = e.sites.length === 0 ? 'None registered' : `${e.sites.length} site${e.sites.length === 1 ? '' : 's'} within ${radius}`
  const sub = e.sites.length === 0
    ? `No Superfund site, brownfield or TRI facility within ${radius}.`
    : KIND_ORDER.filter(k => e.counts[k]).map(k => `${e.counts[k]} ${e.counts[k] === 1 ? EPA_KIND_INFO[k].singular : EPA_KIND_INFO[k].plural}`).join(' · ')

  const markers: NearestAmenity[] = e.sites.map(s => ({
    name: s.name ?? EPA_KIND_INFO[s.kind].label,
    distanceKm: s.distanceKm,
    lat: s.lat,
    lng: s.lng,
    category: EPA_KIND_INFO[s.kind].label,
  }))
  const legend: LegendItem[] = [
    { color: '#f97316', label: 'This address' },
    ...(e.sites.length ? [{ color: '#9ca3af', label: 'EPA-listed site' }] : []),
  ]

  return (
    <>
      <CardShell
        icon={FlaskConical}
        label="EPA-Listed Sites"
        value={value}
        valueColor={worst ? EPA_KIND_INFO[worst].color : '#22c55e'}
        sub={sub}
        footer={US_RISK_NOTE}
        onOpen={() => setOpen(true)}
      />
      {open && (
        <MetricInfoModal
          metricKey="epaSites"
          value={value}
          detail={
            <>
              <p>
                <strong className="text-white">
                  {e.sites.length === 0
                    ? `EPA's registry lists no Superfund site, brownfield property or Toxics Release Inventory facility within ${radius} of this address.`
                    : `${e.sites.length} EPA-listed site${e.sites.length === 1 ? '' : 's'} within ${radius}; the nearest ${mi(Math.min(...e.sites.map(s => s.distanceKm)))} away.`}
                </strong>
              </p>
              {e.sites.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {e.sites.map(s => (
                    <li key={`${s.registryId}-${s.kind}`} className="rounded-xl px-3 py-2.5 flex flex-col gap-0.5" style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}>
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-white text-sm font-semibold">{s.name ?? EPA_KIND_INFO[s.kind].label}</span>
                        <span className="text-xs shrink-0">{mi(s.distanceKm)}</span>
                      </span>
                      <span className="text-xs font-semibold" style={{ color: EPA_KIND_INFO[s.kind].color }}>{EPA_KIND_INFO[s.kind].label}</span>
                      <span className="text-[11px]" style={{ color: NEUTRAL }}>
                        {s.status ? `${sentenceCase(s.status)} · ` : ''}
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">EPA record</a>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <ul className="flex flex-col gap-1 text-xs">
                {KIND_ORDER.map(k => <li key={k}><span style={{ color: EPA_KIND_INFO[k].color }}>{EPA_KIND_INFO[k].label}:</span> {EPA_KIND_INFO[k].meaning}</li>)}
              </ul>
              <p className="text-xs">Distances are to EPA&apos;s reference point for each site, which may be its centre or entrance.</p>
              <NoteBox text={US_RISK_NOTE} />
            </>
          }
          map={
            <MetricInfoMap
              basemap="us"
              center={center}
              centerLabel="This address"
              markers={markers}
              markersFromOsm={false}
              searchRadiusMeters={e.radiusMiles * 1609.344}
              legend={legend}
            />
          }
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── section ─────────────────────────────────────────────────────────────────

interface Loaded {
  air: UsAirQualityResult
  weather: UsWeatherResult
  noise: UsNoiseResult
  sunlight: UsSunlightResult
  risks: UsRisksResult
}

function Skeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="rounded-xl p-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <div className="h-3 w-24 rounded mb-3" style={{ backgroundColor: '#2a2a2a' }} />
          <div className="h-6 w-32 rounded mb-2" style={{ backgroundColor: '#2a2a2a' }} />
          <div className="h-2 w-full rounded" style={{ backgroundColor: '#2a2a2a' }} />
        </div>
      ))}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ color: MUTED }} className="text-xs font-medium uppercase tracking-wider">{children}</h3>
}

/** Environment and risk cards for a US address, each from its own source and unscored overall */
export default function UsMetricCards({ location }: { location: GeoLocation }) {
  const [data, setData] = useState<Loaded | null>(null)
  const { lat, lng } = location

  useEffect(() => {
    const providers = environmentProvidersFor('US')
    if (!providers) return
    let cancelled = false
    setData(null)
    Promise.all([
      providers.airQuality(lat, lng),
      providers.weather(lat, lng),
      providers.noise(lat, lng),
      providers.sunlight(lat, lng),
      providers.risks(lat, lng),
    ]).then(([air, weather, noise, sunlight, risks]) => {
      if (!cancelled) setData({ air, weather, noise, sunlight, risks })
    })
    return () => { cancelled = true }
  }, [lat, lng])

  const center = { lat, lng }
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Environment</SectionTitle>
      {data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AirQualityCard a={data.air} center={center} />
          <WeatherCard w={data.weather} />
          <NoiseCard n={data.noise} />
          <SunlightCard s={data.sunlight} />
        </div>
      ) : <Skeleton count={4} />}

      <SectionTitle>Risks</SectionTitle>
      {data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FloodCard f={data.risks.flood} address={location.formattedAddress} />
          <NriCard n={data.risks.nri} />
          <WildfireCard w={data.risks.wildfire} />
          <EpaSitesCard e={data.risks.epa} center={center} />
        </div>
      ) : <Skeleton count={4} />}

      <p className="text-xs flex gap-1.5" style={{ color: NEUTRAL }}>
        <TriangleAlert size={12} className="shrink-0 mt-0.5" />
        <span>Each card comes from its own public source and says so; nothing is estimated where a source has no data.</span>
      </p>
    </div>
  )
}
