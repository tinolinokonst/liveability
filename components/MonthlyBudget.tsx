"use client"

import { useEffect, useState } from 'react'
import { Wallet, Minus, Plus, Pencil } from 'lucide-react'
import type { MonthlyBudget } from '@/lib/budget'
import { AddressMetrics } from '@/lib/types'
import { useHousehold, Household } from './HouseholdContext'
import MetricInfoModal from './MetricInfoModal'

export const INCOME_NOTE = 'Your income is used only to calculate this estimate and is never stored.'
const EXCLUDED_NOTE = 'Estimate — pension contributions, deductions and your actual insurer not included.'
const DEBOUNCE_MS = 600

export function formatChf(n: number): string {
  const abs = Math.abs(Math.round(n)).toLocaleString('de-CH')
  return `${n < 0 ? '−' : ''}CHF ${abs}`
}

// ─── data ────────────────────────────────────────────────────────────────────

export interface BudgetTarget {
  lat: number
  lng: number
  bfsNumber?: number
}

export type BudgetState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; budget: MonthlyBudget }
  | { status: 'error'; message: string }

// In-memory only (this page load): lets the results card, Compare and repeated
// views share answers without refetching. Never persisted.
const budgetCache = new Map<string, MonthlyBudget>()

function cacheKey(t: BudgetTarget, h: Household): string {
  return [t.lat.toFixed(5), t.lng.toFixed(5), t.bfsNumber ?? '', h.grossIncome, h.status, h.adults, h.children].join('|')
}

async function fetchBudget(t: BudgetTarget, h: Household): Promise<MonthlyBudget> {
  const res = await fetch('/api/budget', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: t.lat,
      lng: t.lng,
      bfsNumber: t.bfsNumber,
      household: { grossIncome: h.grossIncome, status: h.status, adults: h.adults, children: h.children },
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Budget unavailable')
  return json as MonthlyBudget
}

/** One budget per target, recomputed (debounced) whenever the household changes. */
export function useMonthlyBudgets(targets: BudgetTarget[]): BudgetState[] {
  const { household } = useHousehold()
  const [states, setStates] = useState<BudgetState[]>(() => targets.map(() => ({ status: 'idle' })))

  const targetsKey = targets.map(t => `${t.lat},${t.lng},${t.bfsNumber ?? ''}`).join(';')
  const householdKey = `${household.grossIncome}|${household.status}|${household.adults}|${household.children}`

  useEffect(() => {
    if (!household.grossIncome) {
      setStates(targets.map(() => ({ status: 'idle' })))
      return
    }
    const cached = targets.map(t => budgetCache.get(cacheKey(t, household)))
    if (cached.every(Boolean)) {
      setStates(cached.map(b => ({ status: 'ok', budget: b! })))
      return
    }

    let cancelled = false
    setStates(targets.map((_, i) => (cached[i] ? { status: 'ok', budget: cached[i]! } : { status: 'loading' })))
    const timer = setTimeout(() => {
      targets.forEach((t, i) => {
        if (cached[i]) return
        fetchBudget(t, household)
          .then(budget => {
            budgetCache.set(cacheKey(t, household), budget)
            if (!cancelled) setStates(prev => prev.map((s, j) => (j === i ? { status: 'ok', budget } : s)))
          })
          .catch(err => {
            if (!cancelled) setStates(prev => prev.map((s, j) => (j === i ? { status: 'error', message: err instanceof Error ? err.message : 'Budget unavailable' } : s)))
          })
      })
    }, DEBOUNCE_MS)
    return () => { cancelled = true; clearTimeout(timer) }
    // targetsKey/householdKey capture the inputs; the arrays themselves change identity every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetsKey, householdKey])

  return states
}

export function budgetTarget(metrics: AddressMetrics): BudgetTarget {
  return { lat: metrics.location.lat, lng: metrics.location.lng, bfsNumber: metrics.censusData?.bfsNumber }
}

// ─── household inputs ────────────────────────────────────────────────────────

function Stepper({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-xs" style={{ color: '#a0a0a0' }}>{label}</span>
      <div className="flex items-center rounded-xl overflow-hidden" style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Fewer ${label.toLowerCase()}`}
          className="w-11 h-11 flex items-center justify-center shrink-0 disabled:opacity-30"
          style={{ color: '#a0a0a0' }}
        >
          <Minus size={14} />
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-white" aria-live="polite">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`More ${label.toLowerCase()}`}
          className="w-11 h-11 flex items-center justify-center shrink-0 disabled:opacity-30"
          style={{ color: '#a0a0a0' }}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

/** onEdit fires on any change, so a parent can keep the form open while it is in use */
export function HouseholdForm({ onEdit }: { onEdit?: () => void } = {}) {
  const { household, setHousehold: setShared } = useHousehold()
  function setHousehold(update: Partial<Household>) {
    onEdit?.()
    setShared(update)
  }
  const [incomeText, setIncomeText] = useState(household.grossIncome ? String(household.grossIncome) : '')

  // Keep the field in sync when another card edits the shared household
  useEffect(() => {
    setIncomeText(prev => (Number(prev) === household.grossIncome ? prev : household.grossIncome ? String(household.grossIncome) : ''))
  }, [household.grossIncome])

  function onIncome(text: string) {
    const digits = text.replace(/[^\d]/g, '').slice(0, 7)
    setIncomeText(digits)
    const n = Number(digits)
    setHousehold({ grossIncome: n > 0 ? n : null })
  }

  function onStatus(status: Household['status']) {
    // Nudge the adult count to the usual size for the status
    const adults = status === 'married' && household.adults < 2 ? 2 : status === 'single' && household.adults === 2 ? 1 : household.adults
    setHousehold({ status, adults })
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs" style={{ color: '#a0a0a0' }}>Gross annual household income</span>
        <div className="flex items-center rounded-xl px-3 focus-within:ring-2 focus-within:ring-[#f97316]" style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}>
          <span className="text-sm shrink-0" style={{ color: '#a0a0a0' }}>CHF</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={incomeText}
            onChange={e => onIncome(e.target.value)}
            placeholder="e.g. 120000"
            aria-label="Gross annual household income in CHF"
            className="flex-1 min-w-0 bg-transparent px-2 h-11 text-base text-white outline-none"
          />
          <span className="text-xs shrink-0" style={{ color: '#6b6b6b' }}>/ year</span>
        </div>
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
          <span className="text-xs" style={{ color: '#a0a0a0' }}>Status</span>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }} role="radiogroup" aria-label="Marital status">
            {(['single', 'married'] as const).map(s => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={household.status === s}
                onClick={() => onStatus(s)}
                className="h-9 rounded-lg text-sm font-semibold capitalize transition-colors"
                style={household.status === s ? { backgroundColor: '#f97316', color: 'white' } : { color: '#a0a0a0' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <Stepper label="Adults" value={household.adults} min={1} max={6} onChange={adults => setHousehold({ adults })} />
        <Stepper label="Children" value={household.children} min={0} max={10} onChange={children => setHousehold({ children })} />
      </div>

      <p className="text-xs" style={{ color: '#6b6b6b' }}>{INCOME_NOTE}</p>
    </div>
  )
}

function householdSummary(h: Household): string {
  const people = [`${h.adults} adult${h.adults === 1 ? '' : 's'}`]
  if (h.children) people.push(`${h.children} child${h.children === 1 ? '' : 'ren'}`)
  return `${formatChf(h.grossIncome ?? 0)}/yr · ${h.status} · ${people.join(', ')}`
}

// ─── breakdown (card lines and modal detail) ─────────────────────────────────

function Line({ label, value, sub, subWarn, strong }: { label: string; value: string; sub?: string; subWarn?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className={`text-sm ${strong ? 'text-white font-semibold' : ''}`} style={strong ? undefined : { color: '#a0a0a0' }}>{label}</p>
        {sub && <p className="text-xs" style={{ color: subWarn ? '#f59e0b' : '#6b6b6b' }}>{sub}</p>}
      </div>
      <p className={`text-sm tabular-nums shrink-0 ${strong ? 'text-white font-semibold' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function BudgetLines({ b }: { b: MonthlyBudget }) {
  return (
    <div className="flex flex-col divide-y divide-[#2a2a2a]">
      <Line label="Gross monthly income" value={formatChf(b.grossMonthly)} strong />
      <Line label="− Social contributions" sub="AHV/IV/EO, ALV" value={formatChf(-b.social.monthly)} />
      <Line label="− Income tax" sub={`Federal + cantonal + communal, ${b.tax.taxYear}`} value={formatChf(-b.tax.monthly)} />
      <Line label="− Health insurance" sub={`Basic insurance, ${b.health.premiumYear} premiums`} value={formatChf(-b.health.monthly)} />
      <Line
        label="− Rent estimate"
        sub={b.rent.outsideCoverage
          ? `No rent data here — nearest covered area: ${b.rent.area}, ${Math.round(b.rent.distanceKm)} km away`
          : b.rent.area}
        subWarn={b.rent.outsideCoverage}
        value={formatChf(-b.rent.monthly)}
      />
    </div>
  )
}

function BudgetDetail({ b, household }: { b: MonthlyBudget; household: Household }) {
  return (
    <>
      <p>
        For a household of <strong className="text-white">{householdSummary(household)}</strong> in canton{' '}
        <strong className="text-white">{b.canton}</strong> (BFS commune {b.bfsNumber}), an estimated{' '}
        <strong className="text-white">{formatChf(b.leftMonthly)}</strong> is left each month after the costs below.
      </p>
      <div className="rounded-xl px-3 py-1" style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}>
        <BudgetLines b={b} />
        <div style={{ borderTop: '1px solid #2a2a2a' }}>
          <Line label="= Left each month" value={formatChf(b.leftMonthly)} strong />
        </div>
      </div>
      <p className="font-semibold text-white">Per year</p>
      <ul style={{ paddingLeft: '1rem', listStyleType: 'disc' }} className="flex flex-col gap-1">
        <li>Income tax {formatChf(b.tax.annual)}: federal {formatChf(b.tax.federal)}, cantonal {formatChf(b.tax.cantonal)}, communal {formatChf(b.tax.communal)}{b.tax.personal ? `, personal tax ${formatChf(b.tax.personal)}` : ''}. Computed for an income of {formatChf(b.tax.incomeBracket)} (nearest CHF 5,000).</li>
        <li>Social contributions: AHV/IV/EO {formatChf(b.social.ahvIvEoAnnual)}, ALV {formatChf(b.social.alvAnnual)} (employee share, {b.social.year} rates).</li>
        <li>Health insurance: {formatChf(b.health.adultMonthly)} per adult{household.children ? ` and ${formatChf(b.health.childMonthly)} per child` : ''} per month, the regional average.</li>
      </ul>
      <p className="font-semibold text-white">Assumptions</p>
      <ul style={{ paddingLeft: '1rem', listStyleType: 'disc' }} className="flex flex-col gap-1">
        {b.assumptions.map(a => <li key={a}>{a}</li>)}
      </ul>
      <div className="rounded-xl px-3 py-2.5 text-xs leading-relaxed" style={{ backgroundColor: '#f973161a', border: '1px solid #f9731633', color: '#f97316' }}>
        {EXCLUDED_NOTE}
      </div>
    </>
  )
}

// ─── card on address / area results ──────────────────────────────────────────

export function MonthlyBudgetCard({ metrics }: { metrics: AddressMetrics }) {
  const { household } = useHousehold()
  const [state] = useMonthlyBudgets([budgetTarget(metrics)])
  const [editing, setEditing] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const hasIncome = !!household.grossIncome

  return (
    <div className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#a0a0a0' }}>
          <Wallet size={14} />
          Monthly Budget
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: '#a0a0a0', backgroundColor: '#2a2a2a' }}>
          Estimate
        </span>
      </div>

      {!hasIncome && (
        <p className="text-sm" style={{ color: '#a0a0a0' }}>
          Enter your household income to see what&apos;s left each month here after social contributions,
          income tax, health insurance and rent.
        </p>
      )}

      {hasIncome && state.status === 'loading' && (
        <div className="flex flex-col gap-2 animate-pulse" aria-label="Calculating budget">
          {[...Array(5)].map((_, i) => <div key={i} className="h-5 rounded" style={{ backgroundColor: '#2a2a2a' }} />)}
          <div className="h-9 w-40 rounded-lg self-end" style={{ backgroundColor: '#2a2a2a' }} />
        </div>
      )}

      {hasIncome && state.status === 'error' && (
        <p className="text-sm" style={{ color: '#ef4444' }}>{state.message}</p>
      )}

      {hasIncome && state.status === 'ok' && (
        <>
          <BudgetLines b={state.budget} />
          <div className="flex items-center justify-between gap-3 pt-3" style={{ borderTop: '1px solid #2a2a2a' }}>
            <p className="text-sm text-white font-semibold">= Left each month</p>
            <button
              type="button"
              onClick={() => setShowDetail(true)}
              className="text-2xl sm:text-3xl font-black tabular-nums rounded-lg px-2 -mr-2 transition-colors hover:bg-[#f973161a]"
              style={{ color: state.budget.leftMonthly < 0 ? '#ef4444' : '#f97316' }}
              title="See the full breakdown"
            >
              {formatChf(state.budget.leftMonthly)}
            </button>
          </div>
        </>
      )}

      {hasIncome && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-xs truncate" style={{ color: '#6b6b6b' }}>{householdSummary(household)}</p>
          <button
            type="button"
            onClick={() => setEditing(e => !e)}
            className="text-xs font-semibold flex items-center gap-1 shrink-0 px-2 py-1.5 rounded-lg"
            style={{ color: '#f97316' }}
            aria-expanded={editing}
          >
            <Pencil size={12} /> {editing ? 'Done' : 'Edit household'}
          </button>
        </div>
      )}

      {/* Stays open while in use: the first digit typed must not collapse it */}
      {editing || !hasIncome
        ? <HouseholdForm onEdit={() => setEditing(true)} />
        : <p className="text-xs" style={{ color: '#6b6b6b' }}>{INCOME_NOTE}</p>}

      {showDetail && state.status === 'ok' && (
        <MetricInfoModal
          metricKey="budget"
          value={`${formatChf(state.budget.leftMonthly)} / month`}
          detail={<BudgetDetail b={state.budget} household={household} />}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  )
}

// ─── side-by-side in Compare ─────────────────────────────────────────────────

const COMPARE_TIE_CHF = 50

export function placeLabel(addr: AddressMetrics, index: number, all: AddressMetrics[]): string {
  const commune = addr.censusData?.commune
  const letter = `Address ${String.fromCharCode(65 + index)}`
  // A commune name only identifies the address if no other one shares it
  if (commune && all.filter(a => a.censusData?.commune === commune).length === 1) return commune
  return letter
}

export function budgetGap(
  entries: Array<{ label: string; left: number }>
): { best: string; worst: string; diff: number; tie: boolean } | null {
  if (entries.length < 2) return null
  const sorted = [...entries].sort((a, b) => b.left - a.left)
  const best = sorted[0], worst = sorted[sorted.length - 1]
  const diff = Math.round((best.left - worst.left) / 10) * 10
  return { best: best.label, worst: worst.label, diff, tie: best.left - worst.left < COMPARE_TIE_CHF }
}

export function BudgetComparison({ addresses, accents }: { addresses: AddressMetrics[]; accents: string[] }) {
  const { household } = useHousehold()
  const states = useMonthlyBudgets(addresses.map(budgetTarget))
  const [open, setOpen] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)

  const labels = addresses.map((a, i) => placeLabel(a, i, addresses))
  const ready = states.every(s => s.status === 'ok')
  const headline = ready
    ? budgetGap(states.map((s, i) => ({ label: labels[i], left: (s as { budget: MonthlyBudget }).budget.leftMonthly })))
    : null
  const bestLeft = ready ? Math.max(...states.map(s => (s as { budget: MonthlyBudget }).budget.leftMonthly)) : null

  // When an address has no rent data of its own, the gap above is partly a rent
  // placeholder, so also show the gap before rent — tax, insurance and
  // contributions only, which are solid for every commune.
  const placeholderRent = ready
    ? states.flatMap((s, i) => ((s as { budget: MonthlyBudget }).budget.rent.outsideCoverage ? [labels[i]] : []))
    : []
  const beforeRent = ready && placeholderRent.length > 0
    ? budgetGap(states.map((s, i) => {
        const b = (s as { budget: MonthlyBudget }).budget
        return { label: labels[i], left: b.leftMonthly + b.rent.monthly }
      }))
    : null

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#a0a0a0' }}>
          <Wallet size={14} /> Monthly Budget
        </span>
        {!!household.grossIncome && (
          <button type="button" onClick={() => setEditing(e => !e)} className="text-xs font-semibold flex items-center gap-1 px-2 py-1.5 rounded-lg" style={{ color: '#f97316' }} aria-expanded={editing}>
            <Pencil size={12} /> {editing ? 'Done' : 'Edit household'}
          </button>
        )}
      </div>

      {!household.grossIncome && (
        <p className="text-sm" style={{ color: '#a0a0a0' }}>
          Enter your household income to compare what&apos;s left each month at each address.
        </p>
      )}

      {!!household.grossIncome && (
        <>
          {headline && (
            <p className="text-base sm:text-lg font-bold leading-snug" style={{ color: headline.tie ? 'white' : '#f97316' }}>
              {headline.tie
                ? `About the same left over everywhere (within ${formatChf(COMPARE_TIE_CHF)}/month)`
                : `${formatChf(headline.diff)}/month more left over in ${headline.best} than in ${headline.worst}`}
            </p>
          )}
          {beforeRent && (
            <p className="text-xs leading-relaxed -mt-1" style={{ color: '#f59e0b' }}>
              No rent data for {placeholderRent.join(' or ')}; its rent is a placeholder from the nearest covered
              area. Before rent, {beforeRent.tie
                ? 'the addresses are about the same'
                : `${beforeRent.best} leaves ${formatChf(beforeRent.diff)}/month more`}.
            </p>
          )}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${addresses.length}, minmax(0, 1fr))` }}>
            {addresses.map((addr, i) => {
              const s = states[i]
              const isBest = s.status === 'ok' && bestLeft !== null && s.budget.leftMonthly === bestLeft && !headline?.tie
              const edge = isBest ? '#f97316' : '#2a2a2a'
              return (
                <button
                  key={addr.id}
                  type="button"
                  disabled={s.status !== 'ok'}
                  onClick={() => setOpen(i)}
                  className="rounded-xl p-3 text-left flex flex-col gap-1 min-w-0 transition-colors enabled:hover:border-[#f97316]"
                  // Longhands only: mixing `border` with `borderLeft` mis-renders when isBest changes
                  style={{
                    backgroundColor: '#0f0f0f',
                    borderStyle: 'solid',
                    borderWidth: '1px 1px 1px 3px',
                    borderTopColor: edge,
                    borderRightColor: edge,
                    borderBottomColor: edge,
                    borderLeftColor: accents[i],
                  }}
                >
                  <span className="text-xs font-semibold truncate" style={{ color: accents[i] }}>{labels[i]}</span>
                  {s.status === 'ok' ? (
                    <>
                      <span className="text-lg sm:text-xl font-black tabular-nums" style={{ color: s.budget.leftMonthly < 0 ? '#ef4444' : 'white' }}>
                        {formatChf(s.budget.leftMonthly)}
                      </span>
                      <span className="text-[11px] leading-snug" style={{ color: '#6b6b6b' }}>
                        left / month · tax {formatChf(s.budget.tax.monthly)} · health {formatChf(s.budget.health.monthly)} · rent {formatChf(s.budget.rent.monthly)}
                      </span>
                    </>
                  ) : s.status === 'error' ? (
                    <span className="text-xs" style={{ color: '#ef4444' }}>{s.message}</span>
                  ) : (
                    <span className="h-6 w-24 rounded animate-pulse" style={{ backgroundColor: '#2a2a2a' }} />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* One fixed position for the form, so typing the first digit neither
          collapses it nor remounts the input (which would drop focus) */}
      {editing || !household.grossIncome
        ? <HouseholdForm onEdit={() => setEditing(true)} />
        : <p className="text-xs" style={{ color: '#6b6b6b' }}>{householdSummary(household)} · {INCOME_NOTE}</p>}

      {open !== null && states[open]?.status === 'ok' && (
        <MetricInfoModal
          metricKey="budget"
          value={`${formatChf((states[open] as { budget: MonthlyBudget }).budget.leftMonthly)} / month · ${labels[open]}`}
          detail={<BudgetDetail b={(states[open] as { budget: MonthlyBudget }).budget} household={household} />}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}
