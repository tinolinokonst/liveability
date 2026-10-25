"use client"

import { useEffect, useState } from 'react'
import { Wallet, Pencil } from 'lucide-react'
import type { UsMonthlyBudget } from '@/lib/usBudget'
import { useHousehold, Household } from './HouseholdContext'
import { HouseholdForm, INCOME_NOTE } from './MonthlyBudget'
import MetricInfoModal from './MetricInfoModal'
import { SENSITIVE_TEXT } from '@/lib/analytics'
import { usd } from '@/lib/usMetrics'

// The US counterpart of MonthlyBudgetCard (components/MonthlyBudget.tsx), with
// the same privacy rules: the household lives in HouseholdContext (this tab
// only), the income goes to the server only in a POST body, every figure here
// is masked in session replays, and the input itself is blocked from them.

export const US_BUDGET_DISCLAIMER = 'An estimate, not tax or financial advice.'
const DEBOUNCE_MS = 600

type State = { status: 'idle' } | { status: 'loading' } | { status: 'ok'; budget: UsMonthlyBudget } | { status: 'error'; message: string }

// In-memory only (this page load), never persisted
const cache = new Map<string, UsMonthlyBudget>()

function summary(h: Household): string {
  const people = [`${h.adults} adult${h.adults === 1 ? '' : 's'}`]
  if (h.children) people.push(`${h.children} child${h.children === 1 ? '' : 'ren'}`)
  return `${usd(h.grossIncome ?? 0)}/yr · ${h.status === 'married' ? 'married filing jointly' : 'single'} · ${people.join(', ')}`
}

function Line({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className={`text-sm ${strong ? 'text-white font-semibold' : ''}`} style={strong ? undefined : { color: '#a0a0a0' }}>{label}</p>
        {sub && <p className="text-xs" style={{ color: '#6b6b6b' }}>{sub}</p>}
      </div>
      <p className={`text-sm tabular-nums shrink-0 ${strong ? 'text-white font-semibold' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function Lines({ b }: { b: UsMonthlyBudget }) {
  return (
    <div className="flex flex-col divide-y divide-[#2a2a2a]">
      <Line label="Gross monthly income" value={usd(b.grossMonthly)} strong />
      <Line label="− FICA" sub="Social Security and Medicare" value={usd(-b.fica.monthly)} />
      <Line label="− Federal income tax" sub={`${b.taxYear} brackets${b.federalTax.childCreditAnnual ? ', after Child Tax Credit' : ''}`} value={usd(-b.federalTax.monthly)} />
      <Line label="− State income tax" sub={b.stateTax.annual ? `${b.state}, ${b.taxYear}` : `${b.state}: none on wages`} value={usd(-b.stateTax.monthly)} />
      <Line
        label="− Rent"
        sub={b.rent ? `HUD ${b.rent.fiscalYear} Fair Market Rent, ${b.rent.bedrooms === 0 ? 'studio' : `${b.rent.bedrooms} bedroom${b.rent.bedrooms === 1 ? '' : 's'}`} · ${b.rent.label}` : 'No HUD rent for this location'}
        value={b.rent ? usd(-b.rent.monthly) : '—'}
      />
    </div>
  )
}

function Detail({ b, household }: { b: UsMonthlyBudget; household: Household }) {
  return (
    <>
      <p>
        For a household of <strong className="text-white">{summary(household)}</strong> in{' '}
        <strong className="text-white">{b.state}</strong>, an estimated <strong className="text-white">{usd(b.leftMonthly)}</strong> is
        left each month after the costs below.
      </p>
      <div className="rounded-xl px-3 py-1" style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}>
        <Lines b={b} />
        <div style={{ borderTop: '1px solid #2a2a2a' }}>
          <Line label="= Left each month" value={usd(b.leftMonthly)} strong />
        </div>
      </div>
      <p className="font-semibold text-white">Per year</p>
      <ul style={{ paddingLeft: '1rem', listStyleType: 'disc' }} className="flex flex-col gap-1">
        <li>Federal income tax {usd(b.federalTax.annual)}{b.federalTax.childCreditAnnual ? ` after a Child Tax Credit of ${usd(b.federalTax.childCreditAnnual)}` : ''}.</li>
        <li>State income tax ({b.state}) {usd(b.stateTax.annual)}.</li>
        <li>FICA: Social Security {usd(b.fica.socialSecurityAnnual)}, Medicare {usd(b.fica.medicareAnnual)} (employee share).</li>
      </ul>
      <p className="font-semibold text-white">Assumptions</p>
      <ul style={{ paddingLeft: '1rem', listStyleType: 'disc' }} className="flex flex-col gap-1">
        {b.assumptions.map(a => <li key={a}>{a}</li>)}
      </ul>
      {b.stateCaveats.length > 0 && (
        <>
          <p className="font-semibold text-white">{b.state} rules this estimate leaves out</p>
          <ul style={{ paddingLeft: '1rem', listStyleType: 'disc' }} className="flex flex-col gap-1 text-xs">
            {b.stateCaveats.map(c => <li key={c}>{c}</li>)}
          </ul>
        </>
      )}
      <div className="rounded-xl px-3 py-2.5 text-xs leading-relaxed" style={{ backgroundColor: '#f973161a', border: '1px solid #f9731633', color: '#f97316' }}>
        {US_BUDGET_DISCLAIMER} Pre-tax savings, other deductions and credits, and local taxes can change it considerably.
      </div>
    </>
  )
}

export function UsMonthlyBudgetCard({ lat, lng }: { lat: number; lng: number }) {
  const { household } = useHousehold()
  const [state, setState] = useState<State>({ status: 'idle' })
  const [editing, setEditing] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const hasIncome = !!household.grossIncome
  const key = [lat.toFixed(5), lng.toFixed(5), household.grossIncome, household.status, household.adults, household.children].join('|')

  useEffect(() => {
    if (!household.grossIncome) { setState({ status: 'idle' }); return }
    const hit = cache.get(key)
    if (hit) { setState({ status: 'ok', budget: hit }); return }
    let cancelled = false
    setState({ status: 'loading' })
    const timer = setTimeout(async () => {
      try {
        // POST only: the income must never appear in a URL or an access log
        const res = await fetch('/api/us/budget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng, household: { grossIncome: household.grossIncome, status: household.status, adults: household.adults, children: household.children } }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Budget unavailable')
        cache.set(key, json as UsMonthlyBudget)
        if (!cancelled) setState({ status: 'ok', budget: json as UsMonthlyBudget })
      } catch (err) {
        if (!cancelled) setState({ status: 'error', message: err instanceof Error ? err.message : 'Budget unavailable' })
      }
    }, DEBOUNCE_MS)
    return () => { cancelled = true; clearTimeout(timer) }
    // key captures every input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    // Every figure here is income-derived: masked in session replays
    <div className={`rounded-2xl p-4 sm:p-5 flex flex-col gap-3 ${SENSITIVE_TEXT}`} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#a0a0a0' }}>
          <Wallet size={14} /> Monthly Budget
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: '#a0a0a0', backgroundColor: '#2a2a2a' }}>Estimate</span>
      </div>

      {!hasIncome && (
        <p className="text-sm" style={{ color: '#a0a0a0' }}>
          Enter your household income to see what&apos;s left each month here after FICA, federal and state income tax, and rent.
        </p>
      )}
      {hasIncome && state.status === 'loading' && (
        <div className="flex flex-col gap-2 animate-pulse" aria-label="Calculating budget">
          {[...Array(5)].map((_, i) => <div key={i} className="h-5 rounded" style={{ backgroundColor: '#2a2a2a' }} />)}
        </div>
      )}
      {hasIncome && state.status === 'error' && <p className="text-sm" style={{ color: '#ef4444' }}>{state.message}</p>}
      {hasIncome && state.status === 'ok' && (
        <>
          <Lines b={state.budget} />
          <div className="flex items-center justify-between gap-3 pt-3" style={{ borderTop: '1px solid #2a2a2a' }}>
            <p className="text-sm text-white font-semibold">= Left each month</p>
            <button
              type="button"
              onClick={() => setShowDetail(true)}
              className="text-2xl sm:text-3xl font-black tabular-nums rounded-lg px-2 -mr-2 transition-colors hover:bg-[#f973161a]"
              style={{ color: state.budget.leftMonthly < 0 ? '#ef4444' : '#f97316' }}
              title="See the full breakdown"
            >
              {usd(state.budget.leftMonthly)}
            </button>
          </div>
        </>
      )}

      {hasIncome && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-xs truncate" style={{ color: '#6b6b6b' }}>{summary(household)}</p>
          <button type="button" onClick={() => setEditing(e => !e)} className="text-xs font-semibold flex items-center gap-1 shrink-0 px-2 py-1.5 rounded-lg" style={{ color: '#f97316' }} aria-expanded={editing}>
            <Pencil size={12} /> {editing ? 'Done' : 'Edit household'}
          </button>
        </div>
      )}
      {editing || !hasIncome
        ? <HouseholdForm currency="USD" onEdit={() => setEditing(true)} />
        : <p className="text-xs" style={{ color: '#6b6b6b' }}>{INCOME_NOTE} {US_BUDGET_DISCLAIMER}</p>}

      {showDetail && state.status === 'ok' && (
        <MetricInfoModal
          metricKey="budget"
          value={`${usd(state.budget.leftMonthly)} / month`}
          detail={<Detail b={state.budget} household={household} />}
          sources={[
            { label: 'Federal tax: IRS Rev. Proc. 2025-32 (2026 brackets, standard deduction)', url: 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf' },
            { label: 'State tax: Tax Foundation, State Individual Income Tax Rates and Brackets, 2026', url: 'https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/' },
            { label: 'Rent: HUD Fair Market Rents', url: 'https://www.huduser.gov/portal/datasets/fmr.html' },
          ]}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  )
}
