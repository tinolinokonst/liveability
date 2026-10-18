// Client side of the Risks section: fetching, display wording, and how risks
// lower the composite score. Server lookups live in lib/riskSources.ts.

import { fetchRadon, radonPenalty } from './radon'

import type {
  ContaminatedSite,
  ContaminatedSiteStatus,
  ContaminatedSiteType,
  ContaminationResult,
  HazardLevel,
  HazardResult,
  HazardType,
  HazardZone,
  RisksResult,
} from './types'

const ERROR_MESSAGE = 'Temporarily unavailable — try again later.'

export const RISKS_UNAVAILABLE: RisksResult = {
  hazards: { status: 'error', level: null, zone: null, processes: [], credits: [], message: ERROR_MESSAGE },
  contamination: { status: 'error', sites: [], radiusM: 100, credits: [], message: ERROR_MESSAGE },
}

async function fetchBaseRisks(lat: number, lng: number): Promise<RisksResult> {
  try {
    const res = await fetch(`/api/risks?lat=${lat}&lng=${lng}`)
    if (!res.ok) return RISKS_UNAVAILABLE
    return await res.json()
  } catch {
    return RISKS_UNAVAILABLE
  }
}

/** opts.radon: the server-side RADON_ENABLED flag (via useFeatureFlags); off → radon is never requested */
export async function fetchRisks(lat: number, lng: number, opts: { radon?: boolean } = {}): Promise<RisksResult> {
  const [base, radon] = await Promise.all([
    fetchBaseRisks(lat, lng),
    opts.radon ? fetchRadon(lat, lng) : Promise.resolve(undefined),
  ])
  return radon ? { ...base, radon } : base
}

// ─── score penalties ─────────────────────────────────────────────────────────
//
// Risks only ever subtract from the composite score, after the weighted mean
// of the other metrics. Anything that isn't a positive finding — no data, an
// uncovered canton, an area the canton never mapped, a failed lookup — leaves
// the score exactly as it was. Hazard and contamination penalties are each the
// worst single finding (not a sum), so ten small sites don't outweigh one bad one.

const HAZARD_PENALTY: Record<HazardLevel, number> = { none: 0, low: 3, medium: 8, high: 15 }

const ON_SITE_PENALTY: Record<ContaminatedSiteStatus, number> = {
  remediation_needed: 10,
  monitoring_needed: 6,
  investigation_needed: 6,
  not_yet_assessed: 4,
  no_action_needed: 2,
  no_harm_expected: 2,
  other: 2,
}
const NEARBY_PENALTY: Partial<Record<ContaminatedSiteStatus, number>> = {
  remediation_needed: 4,
  monitoring_needed: 2,
  investigation_needed: 2,
}

export function hazardPenalty(h: HazardResult | undefined): number {
  return h?.status === 'ok' && h.level ? HAZARD_PENALTY[h.level] : 0
}

export function sitePenalty(site: ContaminatedSite): number {
  return site.onSite ? ON_SITE_PENALTY[site.status] : NEARBY_PENALTY[site.status] ?? 0
}

export function contaminationPenalty(c: ContaminationResult | undefined): number {
  if (c?.status !== 'ok') return 0
  return c.sites.reduce((worst, s) => Math.max(worst, sitePenalty(s)), 0)
}

export function riskPenalty(risks: RisksResult | undefined): number {
  // radon is only present when it was fetched with the feature on
  return hazardPenalty(risks?.hazards) + contaminationPenalty(risks?.contamination) + radonPenalty(risks?.radon)
}

// ─── wording ─────────────────────────────────────────────────────────────────

export const HAZARD_TYPE_LABEL: Record<HazardType, string> = {
  flood: 'Flood',
  landslide: 'Landslide',
  rockfall: 'Rockfall',
  avalanche: 'Avalanche',
}

export const ZONE_INFO: Record<HazardZone, { label: string; color: string; meaning: string }> = {
  none: { label: 'No hazard', color: '#22c55e', meaning: 'Assessed, no hazard identified' },
  residual: {
    label: 'Residual hazard',
    color: '#d4d4a0',
    meaning: 'Yellow-white hatched zone: only very rare, extreme events reach here',
  },
  low: { label: 'Low hazard', color: '#eab308', meaning: 'Yellow zone: limited damage to buildings possible; precautions advised' },
  medium: {
    label: 'Medium hazard',
    color: '#3b82f6',
    meaning: 'Blue zone: people at risk outside buildings, damage to buildings likely; building only with conditions',
  },
  high: { label: 'High hazard', color: '#ef4444', meaning: 'Red zone: people at risk inside and outside buildings; new buildings generally prohibited' },
}

export const SITE_TYPE_LABEL: Record<ContaminatedSiteType, string> = {
  landfill: 'Landfill or waste deposit',
  industrial: 'Former or current industrial/commercial site',
  accident: 'Accident site',
  shooting_range: 'Shooting range',
  other: 'Registered site',
}

export const SITE_STATUS_INFO: Record<ContaminatedSiteStatus, { label: string; color: string }> = {
  remediation_needed: { label: 'Requires remediation', color: '#ef4444' },
  monitoring_needed: { label: 'Requires monitoring', color: '#f97316' },
  investigation_needed: { label: 'Requires investigation', color: '#f97316' },
  not_yet_assessed: { label: 'Need for investigation not yet assessed', color: '#eab308' },
  no_action_needed: { label: 'Polluted; no monitoring or remediation needed', color: '#a0a0a0' },
  no_harm_expected: { label: 'Polluted; no harmful effects expected', color: '#a0a0a0' },
  other: { label: 'Registered (see official status)', color: '#a0a0a0' },
}

export const RISK_NOTE = 'Informational only — check the official cantonal map before signing a lease.'
