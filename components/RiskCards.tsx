"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Mountain, FlaskConical, TriangleAlert } from 'lucide-react'
import MetricInfoModal from './MetricInfoModal'
import type { LegendItem } from './MetricInfoMap'
import type { ContaminatedSite, ContaminationResult, HazardResult, NearestAmenity, RisksResult } from '@/lib/types'
import {
  contaminationPenalty,
  hazardPenalty,
  HAZARD_TYPE_LABEL,
  RISK_NOTE,
  sitePenalty,
  SITE_STATUS_INFO,
  SITE_TYPE_LABEL,
  ZONE_INFO,
} from '@/lib/risks'

const MetricInfoMap = dynamic(() => import('./MetricInfoMap'), { ssr: false })

const HAZARD_WMS = 'https://geodienste.ch/db/gefahrenkarten_v1_3_0/deu'
// The canton's synoptic map: the worst zone across all processes, in the
// official colours. Limited to ~600 m around the address, so tiles stay few
// and the map stays on the address rather than the region.
const HAZARD_OVERLAY_LAYER = 'synoptisches_gefahrengebiet'
const OVERLAY_HALF_LAT = 0.0055
const OVERLAY_HALF_LNG = 0.008

const MUTED = '#a0a0a0'
const NEUTRAL = '#6b6b6b'

function NoteBox() {
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-xs leading-relaxed flex gap-2"
      style={{ backgroundColor: '#f973161a', border: '1px solid #f9731633', color: '#f97316' }}
    >
      <TriangleAlert size={14} className="shrink-0 mt-0.5" />
      <span>{RISK_NOTE}</span>
    </div>
  )
}

function PenaltyLine({ penalty }: { penalty: number }) {
  return (
    <p className="text-xs" style={{ color: MUTED }}>
      {penalty > 0
        ? <>Effect on the overall score: <strong className="text-white">−{penalty}</strong></>
        : 'No effect on the overall score.'}
    </p>
  )
}

interface CardShellProps {
  icon: typeof Mountain
  label: string
  value: string
  valueColor: string
  sub: string
  onOpen?: () => void
}

function CardShell({ icon: Icon, label, value, valueColor, sub, onOpen }: CardShellProps) {
  return (
    <div
      style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
      className={`rounded-xl border p-4 flex flex-col gap-2 ${onOpen ? 'cursor-pointer transition-colors hover:border-[#f97316]' : ''}`}
      onClick={onOpen}
      onKeyDown={onOpen ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } } : undefined}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <span style={{ color: MUTED }} className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
        <Icon size={14} className="shrink-0" />
        {label}
      </span>
      <span className="text-lg font-bold leading-snug" style={{ color: valueColor }}>{value}</span>
      <span className="text-xs leading-relaxed" style={{ color: MUTED }}>{sub}</span>
      <span className="text-[11px] leading-snug mt-auto pt-1" style={{ color: NEUTRAL }}>{RISK_NOTE}</span>
    </div>
  )
}

// ─── natural hazards ─────────────────────────────────────────────────────────

function hazardCardText(h: HazardResult): { value: string; color: string; sub: string } {
  switch (h.status) {
    case 'unavailable_canton':
      return { value: 'Not available for this canton', color: MUTED, sub: h.message ?? "The canton's terms don't allow us to use its hazard map." }
    case 'error':
      return { value: 'Temporarily unavailable', color: MUTED, sub: h.message ?? 'Try again later.' }
    case 'not_mapped':
      return { value: 'Not mapped here', color: MUTED, sub: `Outside the area the Canton of ${h.cantonName ?? h.canton} has assessed — no statement either way.` }
  }
  const zone = h.zone ?? 'none'
  const hits = h.processes.filter(p => p.zone !== 'none' && p.zone !== 'not_mapped')
  return {
    value: ZONE_INFO[zone].label,
    color: ZONE_INFO[zone].color,
    sub: hits.length
      ? hits.map(p => `${HAZARD_TYPE_LABEL[p.type]}: ${ZONE_INFO[p.zone as keyof typeof ZONE_INFO].label.toLowerCase()}`).join(' · ')
      : 'No flood, landslide, rockfall or avalanche zone at this address.',
  }
}

function hazardSummary(h: HazardResult): React.ReactNode {
  const zone = h.zone ?? 'none'
  const hits = h.processes.filter(p => p.zone !== 'none' && p.zone !== 'not_mapped')
  if (hits.length === 0) {
    return <strong className="text-white">The Canton of {h.cantonName} assessed this address and found no natural hazard zone.</strong>
  }
  const worst = hits.filter(p => p.zone === zone).map(p => HAZARD_TYPE_LABEL[p.type].toLowerCase())
  const zoneWord = { residual: 'a residual (yellow-white)', low: 'a low (yellow)', medium: 'a medium (blue)', high: 'a high (red)', none: 'no' }[zone]
  return (
    <strong className="text-white">
      This address is in {zoneWord} {worst.join(' and ')} hazard zone on the Canton of {h.cantonName}&apos;s hazard map.
    </strong>
  )
}

function HazardDetail({ h }: { h: HazardResult }) {
  return (
    <>
      <p>{hazardSummary(h)}</p>
      <ul className="flex flex-col gap-1.5">
        {h.processes.map(p => (
          <li key={p.type} className="flex items-baseline justify-between gap-3">
            <span>{HAZARD_TYPE_LABEL[p.type]}</span>
            {p.zone === 'not_mapped' ? (
              <span className="text-xs text-right" style={{ color: NEUTRAL }}>Not assessed here</span>
            ) : (
              <span className="text-xs font-semibold text-right" style={{ color: ZONE_INFO[p.zone].color }}>
                {ZONE_INFO[p.zone].label}
              </span>
            )}
          </li>
        ))}
      </ul>
      {h.zone && h.zone !== 'none' && <p className="text-xs">{ZONE_INFO[h.zone].meaning}.</p>}
      <PenaltyLine penalty={hazardPenalty(h)} />
      <NoteBox />
    </>
  )
}

const HAZARD_LEGEND: LegendItem[] = [
  { color: '#f97316', label: 'This address' },
  { color: ZONE_INFO.high.color, label: 'Red: high', shape: 'square' },
  { color: ZONE_INFO.medium.color, label: 'Blue: medium', shape: 'square' },
  { color: ZONE_INFO.low.color, label: 'Yellow: low', shape: 'square' },
  { color: ZONE_INFO.residual.color, label: 'Yellow-white: residual', shape: 'square' },
]

function HazardCard({ h, center }: { h: HazardResult; center: { lat: number; lng: number } }) {
  const [open, setOpen] = useState(false)
  const text = hazardCardText(h)
  // Only the canton's own data may be shown, so no modal map for uncovered cantons
  const canOpen = h.status === 'ok' || h.status === 'not_mapped'

  return (
    <>
      <CardShell icon={Mountain} label="Natural Hazards" value={text.value} valueColor={text.color} sub={text.sub} onOpen={canOpen ? () => setOpen(true) : undefined} />
      {open && (
        <MetricInfoModal
          metricKey="hazards"
          value={text.value}
          detail={h.status === 'ok' ? <HazardDetail h={h} /> : <><p><strong className="text-white">{text.sub}</strong></p><PenaltyLine penalty={0} /><NoteBox /></>}
          map={
            <MetricInfoMap
              center={center}
              centerLabel="This address"
              wmsOverlay={{
                url: HAZARD_WMS,
                layers: HAZARD_OVERLAY_LAYER,
                attribution: `Hazard map: Canton of ${h.cantonName ?? h.canton} via geodienste.ch`,
                bounds: [
                  [center.lat - OVERLAY_HALF_LAT, center.lng - OVERLAY_HALF_LNG],
                  [center.lat + OVERLAY_HALF_LAT, center.lng + OVERLAY_HALF_LNG],
                ],
              }}
              legend={HAZARD_LEGEND}
            />
          }
          sources={h.credits}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── contaminated sites ──────────────────────────────────────────────────────

function contaminationCardText(c: ContaminationResult): { value: string; color: string; sub: string } {
  switch (c.status) {
    case 'unavailable_canton':
      return { value: 'Not available for this canton', color: MUTED, sub: c.message ?? "The canton's terms don't allow us to use its cadastre." }
    case 'error':
    case 'not_mapped':
      return { value: 'Temporarily unavailable', color: MUTED, sub: c.message ?? 'Try again later.' }
  }
  const onSite = c.sites.filter(s => s.onSite).sort((a, b) => sitePenalty(b) - sitePenalty(a))
  if (onSite.length) {
    const worst = onSite[0]
    return { value: 'Registered site at this address', color: SITE_STATUS_INFO[worst.status].color, sub: `${SITE_TYPE_LABEL[worst.type]} · ${SITE_STATUS_INFO[worst.status].label.toLowerCase()}` }
  }
  if (c.sites.length) {
    return {
      value: `${c.sites.length} site${c.sites.length === 1 ? '' : 's'} within ${c.radiusM} m`,
      color: '#eab308',
      sub: `Nearest ${c.sites[0].distanceM} m away · ${SITE_STATUS_INFO[c.sites[0].status].label.toLowerCase()}`,
    }
  }
  return { value: 'None registered', color: '#22c55e', sub: `No registered site at this address or within ${c.radiusM} m.` }
}

function SiteRow({ s }: { s: ContaminatedSite }) {
  const status = SITE_STATUS_INFO[s.status]
  return (
    <li className="rounded-xl px-3 py-2.5 flex flex-col gap-0.5" style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}>
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-white text-sm font-semibold">{SITE_TYPE_LABEL[s.type]}</span>
        <span className="text-xs shrink-0">{s.onSite ? 'At this address' : `${s.distanceM} m away`}</span>
      </span>
      <span className="text-xs font-semibold" style={{ color: status.color }}>{status.label}</span>
      {/* The official wording, so nothing is lost in translation */}
      <span className="text-[11px]" style={{ color: NEUTRAL }}>
        {s.statusLabel} · {s.typeLabel} · No. {s.id} · {s.authority}
      </span>
    </li>
  )
}

function contaminationSummary(c: ContaminationResult): React.ReactNode {
  const onSite = c.sites.filter(s => s.onSite).sort((a, b) => sitePenalty(b) - sitePenalty(a))
  if (onSite.length) {
    return <strong className="text-white">This address lies on a registered contaminated site: {SITE_TYPE_LABEL[onSite[0].type].toLowerCase()}, {SITE_STATUS_INFO[onSite[0].status].label.toLowerCase()}.</strong>
  }
  if (c.sites.length) {
    return <strong className="text-white">No registered site at this address, but {c.sites.length} within {c.radiusM} m — the nearest {c.sites[0].distanceM} m away.</strong>
  }
  return <strong className="text-white">No registered contaminated site at this address or within {c.radiusM} m.</strong>
}

function siteMarkers(sites: ContaminatedSite[]): NearestAmenity[] {
  return sites.map(s => ({
    name: SITE_TYPE_LABEL[s.type],
    distanceKm: s.distanceM / 1000,
    lat: s.lat,
    lng: s.lng,
    category: SITE_STATUS_INFO[s.status].label,
    polygon: s.polygon,
    polygonColor: s.polygon ? SITE_STATUS_INFO[s.status].color : undefined,
    popupLines: [`No. ${s.id} · ${s.authority}`],
  }))
}

function ContaminationCard({ c, center }: { c: ContaminationResult; center: { lat: number; lng: number } }) {
  const [open, setOpen] = useState(false)
  const text = contaminationCardText(c)
  const canOpen = c.status === 'ok'

  return (
    <>
      <CardShell icon={FlaskConical} label="Contaminated Sites" value={text.value} valueColor={text.color} sub={text.sub} onOpen={canOpen ? () => setOpen(true) : undefined} />
      {open && (
        <MetricInfoModal
          metricKey="contamination"
          value={text.value}
          detail={
            <>
              <p>{contaminationSummary(c)}</p>
              {c.sites.length > 0 && <ul className="flex flex-col gap-2">{c.sites.map(s => <SiteRow key={`${s.authority}-${s.id}`} s={s} />)}</ul>}
              <p className="text-xs">
                Registration means the ground is known or suspected to be polluted; whether that matters for
                living there depends on the status above. Sites that need no action are typically harmless for residents.
              </p>
              <PenaltyLine penalty={contaminationPenalty(c)} />
              <NoteBox />
            </>
          }
          map={
            <MetricInfoMap
              center={center}
              centerLabel="This address"
              markers={siteMarkers(c.sites)}
              markersFromOsm={false}
              searchRadiusMeters={c.radiusM}
              legend={[
                { color: '#f97316', label: 'This address' },
                ...(c.sites.length ? [{ color: '#ef4444', label: 'Registered site (colour = status)', shape: 'square' as const }] : []),
              ]}
            />
          }
          sources={c.credits}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── section ─────────────────────────────────────────────────────────────────

export default function RiskCards({ risks, center }: { risks: RisksResult; center: { lat: number; lng: number } }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <HazardCard h={risks.hazards} center={center} />
      <ContaminationCard c={risks.contamination} center={center} />
    </div>
  )
}
