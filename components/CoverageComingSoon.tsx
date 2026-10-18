"use client"

import { MapPin } from 'lucide-react'
import { COUNTRIES, countryOf } from '@/lib/country'
import type { GeoLocation } from '@/lib/types'
import UsMetricCards from './UsMetricCards'

const MUTED = '#a0a0a0'

/**
 * Shown instead of results when an address resolves in a country whose
 * metrics aren't all available yet. It says what we know — the resolved
 * address, for the US its Census geographies, and the environment and risk
 * metrics that do have a source — and claims nothing else: no overall score.
 */
export default function CoverageComingSoon({ location }: { location: GeoLocation }) {
  const country = COUNTRIES[countryOf(location)]
  const us = location.us

  return (
    <section className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
      <div className="flex items-start gap-3">
        <MapPin size={18} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
        <div className="min-w-0">
          <p className="text-white font-semibold">{location.formattedAddress}</p>
          <p className="text-sm" style={{ color: MUTED }}>{country.name}</p>
        </div>
      </div>

      {country.code === 'US' && (
        us ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt style={{ color: MUTED }}>State</dt>
            <dd className="text-white">{us.stateName} ({us.stateAbbr}) · FIPS {us.stateFips}</dd>
            <dt style={{ color: MUTED }}>County</dt>
            <dd className="text-white">{us.countyName} · FIPS {us.stateFips}{us.countyFips}</dd>
            <dt style={{ color: MUTED }}>Census tract</dt>
            <dd className="text-white">{us.tractName} · GEOID {us.tractGeoid}</dd>
          </dl>
        ) : (
          <p className="text-sm" style={{ color: MUTED }}>Census geographies are temporarily unavailable for this address.</p>
        )
      )}

      {country.code === 'US' && <UsMetricCards location={location} />}

      <p className="text-sm" style={{ color: MUTED }}>
        {country.code === 'US'
          ? <>An overall Liveability score for addresses in the {country.name} is on its way — amenities, safety, transit and
            community data come next. Until then each card stands on its own.</>
          : <>Liveability scores for addresses in the {country.name} are on their way — we&apos;re adding the data sources
            now.</>}{' '}
        Distances are shown in {country.distanceUnit === 'mi' ? 'miles' : 'kilometres'} and costs in {country.currency}.
      </p>
    </section>
  )
}
