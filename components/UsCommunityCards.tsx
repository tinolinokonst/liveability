"use client"

import { useState } from 'react'
import { Users, TrendingUp, ShieldCheck, Home } from 'lucide-react'
import MetricCard from './MetricCard'
import MetricInfoModal from './MetricInfoModal'
import { CardShell } from './RiskCards'
import { CardSkeleton, NEUTRAL, ordinal, Row, SectionTitle, UnavailableCard } from './UsMetricCards'
import { HUD_RENT_LABEL, SAFETY_LEVEL_LABEL, UNAVAILABLE, usd } from '@/lib/usMetrics'
import type { AcsFigures, UsCommunityResult, UsRentResult, UsSafetyResult } from '@/lib/types'

const num = (n: number | null | undefined, f: (n: number) => string = n => n.toLocaleString('en-US')) => (n == null ? '—' : f(n))

// ─── community (Census ACS) ──────────────────────────────────────────────────

function CommunityCard({ c }: { c: UsCommunityResult }) {
  const [open, setOpen] = useState(false)
  const footer = 'Source: US Census Bureau, American Community Survey'
  if (c.status !== 'ok' || !c.tract) {
    return <UnavailableCard icon={Users} label="Community" value={c.status === 'no_data' ? 'No estimates here' : UNAVAILABLE} footer={footer} />
  }
  const t = c.tract
  const value = t.medianHouseholdIncome !== null ? `${usd(t.medianHouseholdIncome)} median income` : 'Income not published'
  const sub = [
    t.medianAge !== null ? `Median age ${t.medianAge}` : null,
    c.densityPerSqMi !== null ? `${c.densityPerSqMi.toLocaleString('en-US')} people / sq mi` : null,
    c.county?.medianHouseholdIncome != null ? `county ${usd(c.county.medianHouseholdIncome)}` : null,
  ].filter(Boolean).join(' · ')

  const rows: Array<[string, (a: AcsFigures | null) => string]> = [
    ['Median household income', a => num(a?.medianHouseholdIncome, usd)],
    ['Median gross rent (all units)', a => num(a?.medianGrossRent, n => `${usd(n)}/mo`)],
    ['Median age', a => num(a?.medianAge, n => String(n))],
    ['Population', a => num(a?.population)],
  ]

  return (
    <>
      <CardShell icon={Users} label="Community" value={value} valueColor="white" sub={sub} footer={`${footer} · tract estimate`} onOpen={() => setOpen(true)} />
      {open && (
        <MetricInfoModal
          metricKey="usCommunity"
          value={value}
          detail={
            <>
              <p><strong className="text-white">Census estimates for this tract, its county and the US ({c.acsPeriod} ACS 5-year).</strong></p>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: NEUTRAL }}>
                    <th className="text-left font-normal pb-1"> </th>
                    <th className="text-right font-normal pb-1">Tract</th>
                    <th className="text-right font-normal pb-1">County</th>
                    <th className="text-right font-normal pb-1">US</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([label, f]) => (
                    <tr key={label}>
                      <td className="py-1 pr-2">{label}</td>
                      <td className="py-1 text-right text-white font-semibold">{f(c.tract)}</td>
                      <td className="py-1 text-right">{f(c.county)}</td>
                      <td className="py-1 text-right">{f(c.us)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {c.densityPerSqMi !== null && (
                <p className="text-xs">Population density: <strong className="text-white">{c.densityPerSqMi.toLocaleString('en-US')} people per square mile</strong> of land in this tract.</p>
              )}
              <p className="text-xs">
                Survey estimates pooled over five years, with margins of error that can be wide for a single tract.
                Median rent covers all rented homes, old leases included, so it usually sits below today&apos;s asking rents.
                {c.tractName ? ` ${c.tractName}${c.countyName ? `, ${c.countyName}` : ''}.` : ''}
              </p>
            </>
          }
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── upward mobility (Opportunity Atlas) ─────────────────────────────────────

function MobilityCard({ c }: { c: UsCommunityResult }) {
  const [open, setOpen] = useState(false)
  const footer = 'Source: Opportunity Insights, The Opportunity Atlas'
  if (c.mobilityStatus !== 'ok' || !c.mobility) {
    return (
      <UnavailableCard
        icon={TrendingUp}
        label="Upward Mobility"
        value={c.mobilityStatus === 'no_data' ? 'No estimate here' : UNAVAILABLE}
        sub={c.mobilityStatus === 'no_data' ? 'Too few children grew up in this tract for a reliable estimate.' : 'Try again later.'}
        footer={footer}
      />
    )
  }
  const m = c.mobility
  const diff = m.p25 - m.nationalP25
  const color = diff >= 3 ? '#22c55e' : diff <= -3 ? '#f97316' : 'white'
  const value = `${ordinal(m.p25)} percentile`
  return (
    <>
      <CardShell
        icon={TrendingUp}
        label="Upward Mobility"
        value={value}
        valueColor={color}
        sub={`Adult income of children from lower-income families raised here · US average ${ordinal(m.nationalP25)}`}
        footer={`${footer} · 2010 tract`}
        onOpen={() => setOpen(true)}
      />
      {open && (
        <MetricInfoModal
          metricKey="usMobility"
          value={value}
          detail={
            <>
              <p>
                <strong className="text-white">
                  Children who grew up in this neighbourhood in families at the 25th income percentile reached, on average,
                  the {ordinal(m.p25)} percentile of household income as adults
                </strong>{' '}
                — {Math.abs(diff) < 1 ? 'about the US average' : `${Math.abs(Math.round(diff * 10) / 10)} points ${diff > 0 ? 'above' : 'below'} the US average`} of the {ordinal(m.nationalP25)}.
              </p>
              <ul className="flex flex-col gap-1.5">
                <Row label="This tract (2010 boundaries)" value={`${ordinal(m.p25)} percentile`} color={color} />
                <Row label="US average" value={`${ordinal(m.nationalP25)} percentile`} />
                <Row label="Children in the estimate" value={m.children.toLocaleString('en-US')} />
              </ul>
              <p className="text-xs">
                From tax records of children born 1978–1983, with adult incomes measured in 2014–15: it describes how
                this place shaped earlier generations, not a prediction for any family today. Census tract {m.tract2010} (2010 boundaries).
              </p>
            </>
          }
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── safety (FBI) ────────────────────────────────────────────────────────────

function ratioText(local: number | null, ref: number | null): string {
  if (local === null || !ref) return ''
  const r = local / ref
  if (r > 0.9 && r < 1.1) return 'about the US rate'
  return r >= 1 ? `${(Math.round(r * 10) / 10).toLocaleString('en-US')}× the US rate` : `${Math.round((1 - r) * 100)} % below the US rate`
}

function SafetyCard({ s }: { s: UsSafetyResult }) {
  const footer = `Source: FBI Crime Data Explorer · ${SAFETY_LEVEL_LABEL}`
  if (s.status !== 'ok' || !s.rates || s.score === null || !s.agency) {
    return (
      <UnavailableCard
        icon={ShieldCheck}
        label="Safety"
        value={s.status === 'no_data' ? 'No FBI data here' : UNAVAILABLE}
        sub={s.message ?? 'Try again later.'}
        footer={footer}
      />
    )
  }
  const r = s.rates
  const us = s.usRates
  return (
    <MetricCard
      label="Safety"
      icon={ShieldCheck}
      value={r.violent !== null ? `${r.violent.toLocaleString('en-US')} violent / 100k` : `${r.property?.toLocaleString('en-US')} property / 100k`}
      score={s.score}
      description={`${SAFETY_LEVEL_LABEL} · ${s.agency.name}, ${s.year} · ${ratioText(r.violent, us?.violent ?? null)}`}
      source="FBI Crime Data Explorer"
      metricKey="usSafety"
      detail={
        <>
          <div className="rounded-xl px-3 py-2.5 text-xs leading-relaxed" style={{ backgroundColor: '#f973161a', border: '1px solid #f9731633', color: '#f97316' }}>
            {SAFETY_LEVEL_LABEL}: these are reported offenses for everyone {s.matchedBy === 'county' ? 'the county sheriff serves' : 'the city police serve'}, across the whole jurisdiction. Crime varies a lot from street to street.
          </div>
          <p><strong className="text-white">{s.agency.name}, {s.year}:</strong> offenses per 100,000 people.</p>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: NEUTRAL }}>
                <th className="text-left font-normal pb-1"> </th>
                <th className="text-right font-normal pb-1">{s.matchedBy === 'county' ? 'County' : 'City'}</th>
                <th className="text-right font-normal pb-1">{s.stateName ?? 'State'}</th>
                <th className="text-right font-normal pb-1">US</th>
              </tr>
            </thead>
            <tbody>
              {(['violent', 'property'] as const).map(k => (
                <tr key={k}>
                  <td className="py-1 pr-2 capitalize">{k} crime</td>
                  <td className="py-1 text-right text-white font-semibold">{num(r[k])}</td>
                  <td className="py-1 text-right">{num(s.stateRates?.[k])}</td>
                  <td className="py-1 text-right">{num(us?.[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs">
            The score is 70 at the US rate and moves 30 points for each doubling or halving, with violent crime weighted 70 %.
            Offenses known to police only: unreported crime isn&apos;t counted, and agencies differ in how completely they report.
          </p>
        </>
      }
    />
  )
}

// ─── rent (HUD) ──────────────────────────────────────────────────────────────

const BEDROOM_LABEL = ['Studio', '1 bedroom', '2 bedrooms', '3 bedrooms', '4 bedrooms']

function RentCard({ r }: { r: UsRentResult }) {
  const [open, setOpen] = useState(false)
  const footer = `Source: HUD ${r.fiscalYear} Fair Market Rents`
  if (r.status !== 'ok' || !r.byBedrooms) {
    return <UnavailableCard icon={Home} label="Rent" value={r.status === 'no_data' ? 'No HUD rent here' : UNAVAILABLE} footer={footer} />
  }
  const where = r.level === 'zip' ? `ZIP ${r.zip} (Small Area FMR)` : `${r.areaName ?? 'Metro area'} (area-wide FMR)`
  const value = `${usd(r.byBedrooms[2])}/mo · 2 bedrooms`
  return (
    <>
      <CardShell
        icon={Home}
        label="Rent"
        value={value}
        valueColor="white"
        sub={`${usd(r.byBedrooms[1])} for 1 bedroom · ${where}`}
        footer={HUD_RENT_LABEL}
        onOpen={() => setOpen(true)}
      />
      {open && (
        <MetricInfoModal
          metricKey="usRent"
          value={value}
          detail={
            <>
              <p><strong className="text-white">HUD {r.fiscalYear} Fair Market Rent for {where}.</strong></p>
              <ul className="flex flex-col gap-1.5">
                {r.byBedrooms.map((v, i) => <Row key={i} label={BEDROOM_LABEL[i]} value={`${usd(v)}/mo`} />)}
              </ul>
              <div className="rounded-xl px-3 py-2.5 text-xs leading-relaxed" style={{ backgroundColor: '#f973161a', border: '1px solid #f9731633', color: '#f97316' }}>
                {HUD_RENT_LABEL}. HUD sets it near the 40th percentile of recent rents for a modest unit, including basic utilities.
              </div>
              <p className="text-xs">
                {r.level === 'zip'
                  ? `Small Area FMRs are HUD's rents for a single ZIP code${r.areaName ? `, within the ${r.areaName}` : ''}.`
                  : 'HUD publishes no Small Area FMR for this ZIP code, so this is the rent for the whole metro or county.'}
              </p>
            </>
          }
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── section ─────────────────────────────────────────────────────────────────

export function UsCommunitySection({ community, safety, rent }: { community?: UsCommunityResult; safety?: UsSafetyResult; rent?: UsRentResult }) {
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Cost, community &amp; safety</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rent ? <RentCard r={rent} /> : <CardSkeleton />}
        {safety ? <SafetyCard s={safety} /> : <CardSkeleton />}
        {community ? <CommunityCard c={community} /> : <CardSkeleton />}
        {community ? <MobilityCard c={community} /> : <CardSkeleton />}
      </div>
    </div>
  )
}

