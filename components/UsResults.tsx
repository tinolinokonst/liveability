"use client"

import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import MetricInfoModal from './MetricInfoModal'
import { UsMonthlyBudgetCard } from './UsBudget'
import { UsCommunitySection } from './UsCommunityCards'
import { UsDailyLifeSection } from './UsDailyLifeCards'
import { NEUTRAL, UsEnvironmentSection, UsRisksSection } from './UsMetricCards'
import { useUsResults } from './useUsResults'
import { computeUsScore, type UsScore } from '@/lib/usScore'
import type { GeoLocation } from '@/lib/types'

// Same bands and colours as the Swiss Liveability Score (AddressResults)
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

function subtitle(s: UsScore): string {
  const scored = s.parts.filter(p => p.score !== null).sort((a, b) => b.score! - a.score!)
  if (!scored.length) return 'Based on public data sources'
  const best = scored[0], worst = scored[scored.length - 1]
  const parts = [`${best.score! >= 80 ? 'Excellent' : best.score! >= 65 ? 'Strong' : 'Good'} ${best.label.toLowerCase()}`]
  if (worst !== best && worst.score! < 60) parts.push(`${worst.score! < 30 ? 'Low' : worst.score! < 45 ? 'Weak' : 'Moderate'} ${worst.label.toLowerCase()}`)
  for (const p of s.penalties) parts.push(`−${p.points} ${p.label}`)
  return parts.join(' · ')
}

function ScoreBanner({ s }: { s: UsScore }) {
  const [open, setOpen] = useState(false)
  if (!s.ready || s.score === null) {
    return (
      <div className="rounded-2xl p-5 flex items-center gap-5 animate-pulse" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
        <div className="h-12 w-16 rounded" style={{ backgroundColor: '#2a2a2a' }} />
        <div className="flex flex-col gap-2">
          <div className="text-white font-bold text-base leading-tight">Liveability Score</div>
          <div className="text-sm" style={{ color: '#a0a0a0' }}>
            {s.ready ? 'Not enough data for this address to score it.' : 'Calculating from each source as it answers…'}
          </div>
        </div>
      </div>
    )
  }
  const color = scoreColor(s.score)
  const missing = s.parts.filter(p => p.score === null)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-2xl p-5 flex items-center gap-5 text-left transition-colors hover:border-[#f97316]"
        style={{ backgroundColor: '#1a1a1a', border: `1px solid ${color}40` }}
      >
        <div className="flex flex-col items-center justify-center shrink-0 w-20">
          <div className="text-5xl font-black leading-none" style={{ color }}>{s.score}</div>
          <div className="text-xs font-bold uppercase tracking-wide mt-1.5" style={{ color }}>{scoreLabel(s.score)}</div>
        </div>
        <div className="w-px self-stretch" style={{ backgroundColor: '#2a2a2a' }} />
        <div className="flex flex-col gap-1 min-w-0">
          <div className="text-white font-bold text-base leading-tight">Liveability Score</div>
          <div className="text-sm leading-snug" style={{ color: '#a0a0a0' }}>{subtitle(s)}</div>
        </div>
      </button>
      {open && (
        <MetricInfoModal
          metricKey="usScore"
          value={`${s.score} / 100`}
          detail={
            <>
              <p>
                <strong className="text-white">A weighted average of the scored cards below</strong>, minus penalties for
                risks found at this address. Metrics without data drop out and the rest are re-weighted.
              </p>
              <ul className="flex flex-col gap-1.5">
                {s.parts.map(p => (
                  <li key={p.key} className="flex items-baseline justify-between gap-3">
                    <span>{p.label} <span className="text-xs" style={{ color: NEUTRAL }}>· weight {Math.round(p.weight * 100)}</span></span>
                    <span className="text-xs font-semibold" style={{ color: p.score === null ? NEUTRAL : 'white' }}>{p.score === null ? 'no data' : `${p.score}/100`}</span>
                  </li>
                ))}
                {s.penalties.map(p => (
                  <li key={p.label} className="flex items-baseline justify-between gap-3">
                    <span>{p.label}</span>
                    <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>−{p.points}</span>
                  </li>
                ))}
              </ul>
              {missing.length > 0 && <p className="text-xs">Not counted here: {missing.map(m => m.label.toLowerCase()).join(', ')} (no data for this address).</p>}
              <p className="text-xs">
                Same method and weights as the Swiss score. Green space, healthcare and dining, which the Swiss score also
                counts, aren&apos;t measured for US addresses yet, so their weight is shared out among the rest.
              </p>
            </>
          }
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

/** Everything for a US address: score, budget, then each section as its sources answer */
export default function UsResults({ location }: { location: GeoLocation }) {
  const d = useUsResults(location)
  const score = computeUsScore(d)
  return (
    <div className="flex flex-col gap-5">
      <ScoreBanner s={score} />
      <UsMonthlyBudgetCard lat={location.lat} lng={location.lng} />
      <UsCommunitySection community={d.community} safety={d.safety} rent={d.rent} />
      <UsDailyLifeSection data={d} location={location} />
      <UsEnvironmentSection data={d} location={location} />
      <UsRisksSection risks={d.risks} location={location} />
      <p className="text-xs flex gap-1.5" style={{ color: NEUTRAL }}>
        <TriangleAlert size={12} className="shrink-0 mt-0.5" />
        <span>Each card comes from its own public source and says so; nothing is estimated where a source has no data.</span>
      </p>
    </div>
  )
}
