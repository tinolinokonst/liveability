// The US Liveability Score: the same method as the Swiss one (lib/metrics.ts)
// — a weighted mean of 0-100 metric scores, renormalised over whichever
// metrics resolved, minus penalties for risks found at the address.
//
// Weights are the Swiss weights for the metrics both countries have. The
// Swiss score also counts green space, healthcare and dining (OpenStreetMap
// amenity counts); the US view doesn't measure those yet, so their weight is
// redistributed rather than guessed. Grocery and school counts use the Swiss
// scales (5 stores, 3 schools for full marks), over the US radii (1 mile).

import { compositeScore } from './composite'
import type {
  UsAirQualityResult,
  UsFoodAccessResult,
  UsNoiseResult,
  UsRisksResult,
  UsSafetyResult,
  UsSchoolsResult,
  UsSunlightResult,
  UsTransitResult,
  UsWalkabilityResult,
} from './types'

export interface UsScoreInputs {
  air?: UsAirQualityResult
  walk?: UsWalkabilityResult
  transit?: UsTransitResult
  food?: UsFoodAccessResult
  schools?: UsSchoolsResult
  safety?: UsSafetyResult
  sunlight?: UsSunlightResult
  noise?: UsNoiseResult
  risks?: UsRisksResult
}

export interface UsScorePart { key: string; label: string; score: number | null; weight: number }
export interface UsScorePenalty { label: string; points: number }

export interface UsScore {
  /** false until every input has answered (or failed) */
  ready: boolean
  score: number | null
  parts: UsScorePart[]
  penalties: UsScorePenalty[]
}

const WEIGHTS = { air: 0.18, walkability: 0.18, grocery: 0.08, transit: 0.08, school: 0.05, safety: 0.10, sunlight: 0.05, noise: 0.04 } as const

const countScore = (count: number, full: number) => Math.min(100, Math.round((count / full) * 100))

const NPL_PENALTY_KM = 0.4 // a quarter mile

export function usPenalties(risks: UsRisksResult | undefined): UsScorePenalty[] {
  const out: UsScorePenalty[] = []
  const f = risks?.flood
  if (f?.status === 'ok' && f.risk) {
    // Same scale as the Swiss hazard zones: high 15, medium 8, low 3
    const points = { coastal_high: 15, high: 8, moderate: 3 }[f.risk as string]
    if (points) out.push({ label: `FEMA flood zone ${f.zone}`, points })
  }
  const npl = risks?.epa.status === 'ok' ? risks.epa.sites.find(s => s.kind === 'superfund_npl' && s.distanceKm <= NPL_PENALTY_KM) : undefined
  // Same as a Swiss contaminated site needing remediation nearby
  if (npl) out.push({ label: 'Superfund (NPL) site within ¼ mile', points: 4 })
  return out
}

export function computeUsScore(d: UsScoreInputs): UsScore {
  const ok = <T extends { status?: string }>(r: T | undefined) => (r && r.status === 'ok' ? r : undefined)
  const parts: UsScorePart[] = [
    { key: 'air', label: 'Air quality', score: ok(d.air)?.score ?? null, weight: WEIGHTS.air },
    { key: 'walkability', label: 'Walkability', score: ok(d.walk)?.score ?? null, weight: WEIGHTS.walkability },
    {
      key: 'grocery',
      label: 'Grocery access',
      score: d.food?.groceryStatus === 'ok' && d.food.grocery ? countScore(d.food.grocery.count, 5) : null,
      weight: WEIGHTS.grocery,
    },
    { key: 'transit', label: 'Transit', score: ok(d.transit)?.score ?? null, weight: WEIGHTS.transit },
    { key: 'school', label: 'Schools nearby', score: ok(d.schools)?.schools ? countScore(d.schools!.schools!.count, 3) : null, weight: WEIGHTS.school },
    { key: 'safety', label: 'Safety (city level)', score: ok(d.safety)?.score ?? null, weight: WEIGHTS.safety },
    { key: 'sunlight', label: 'Sunlight', score: ok(d.sunlight)?.score ?? null, weight: WEIGHTS.sunlight },
    { key: 'noise', label: 'Quiet', score: ok(d.noise)?.score ?? null, weight: WEIGHTS.noise },
  ]
  const ready = [d.air, d.walk, d.food, d.transit, d.schools, d.safety, d.sunlight, d.noise, d.risks].every(Boolean)
  const scored = parts.filter(p => p.score !== null)
  // Fewer than half the weight measured: too little to call a score
  const enough = scored.reduce((s, p) => s + p.weight, 0) >= 0.38
  const penalties = usPenalties(d.risks)
  const base = enough ? compositeScore(parts.map(p => [p.score, p.weight])) : null
  return {
    ready,
    score: base === null ? null : Math.max(0, base - penalties.reduce((s, p) => s + p.points, 0)),
    parts,
    penalties,
  }
}
