// Swiss income tax estimates from the ESTV (Federal Tax Administration) tax
// calculator: swisstaxcalculator.estv.admin.ch. Public, no key.
//
// API_calculateDetailedTaxes takes GROSS salary and derives taxable income
// itself, using ESTV's standard deductions (AHV/IV/EO, ALV, NBU, an age-based
// BVG estimate, flat-rate professional expenses, insurance and child
// deductions). So no deduction estimate of our own is applied; the result is
// still an estimate because real deductions differ per person.
//
// The ESTV API has no lookup by BFS number, so communes are resolved through
// lib/data/estv-tax-locations.json (scripts/build-estv-locations.py).
//
// Privacy: the exact income is never logged, persisted or sent upstream. It is
// rounded to a CHF 5,000 bracket first, and the tax is computed for that
// bracket — which is also what makes the shared 30-day cache correct for
// everyone in the bracket.

import locations from './data/estv-tax-locations.json'

const ESTV = 'https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV'
// bfs -> [TaxLocationID, canton]; JSON tuples type as plain arrays, hence the accessor
const LOCATIONS: Record<string, (number | string)[]> = locations.locations

export function estvLocation(bfsNumber: number): { taxLocationId: number; canton: string } | null {
  const entry = LOCATIONS[String(bfsNumber)]
  return entry ? { taxLocationId: Number(entry[0]), canton: String(entry[1]) } : null
}

export const TAX_YEAR: number = locations.taxYear
export const INCOME_BRACKET_STEP = 5_000
const CACHE_SECONDS = 30 * 24 * 60 * 60
const TIMEOUT_MS = 10_000

// Inputs the ESTV calculator needs that the route does not ask for
const DEFAULT_AGE = 35 // drives ESTV's BVG (pension) contribution estimate
const DEFAULT_CHILD_AGE = 10 // school age; some cantons vary child deductions by age

// ESTV enum values, from the calculator's frontend
const RELATIONSHIP = { single: 1, married: 2 } as const
const NO_CONFESSION = 4 // no church tax
const EMPLOYED = 1 // gross salary from employment
const NO_REVENUE = 0
const LANGUAGE_EN = 4

export type MaritalStatus = keyof typeof RELATIONSHIP

export interface TaxInput {
  bfsNumber: number
  /** Gross annual household income, CHF */
  grossIncome: number
  status: MaritalStatus
  children: number
}

export interface TaxEstimate {
  taxYear: number
  bfsNumber: number
  canton: string
  /** The income the tax was computed for: gross income rounded to CHF 5,000 */
  incomeBracket: number
  federal: number
  cantonal: number
  communal: number
  /** Flat per-head tax some cantons levy (e.g. ZH CHF 24 per adult) */
  personal: number
  church: number
  totalAnnual: number
  totalMonthly: number
  taxableIncome: { federal: number; cantonal: number }
  isEstimate: true
  basis: string
  assumptions: string[]
  source: string
}

export type TaxResult =
  | { ok: true; estimate: TaxEstimate }
  | { ok: false; reason: 'unknown_commune' | 'upstream_error' }

export function incomeBracket(grossIncome: number): number {
  return Math.max(0, Math.round(grossIncome / INCOME_BRACKET_STEP) * INCOME_BRACKET_STEP)
}

interface EstvDetailedTaxes {
  IncomeTaxFed: number
  IncomeTaxCanton: number
  IncomeTaxCity: number
  IncomeTaxChurch: number
  PersonalTax: number
  TotalTax: number
  TaxableIncomeFed: number
  TaxableIncomeCanton: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

export async function estimateIncomeTax(input: TaxInput): Promise<TaxResult> {
  const location = estvLocation(input.bfsNumber)
  if (!location) return { ok: false, reason: 'unknown_commune' }
  const { taxLocationId, canton } = location

  const bracket = incomeBracket(input.grossIncome)
  const married = input.status === 'married'

  // Mirrors the calculator frontend's request. The whole household income is
  // attributed to one earner; see assumptions below.
  const body = {
    SimKey: null,
    TaxYear: TAX_YEAR,
    TaxLocationID: taxLocationId,
    Relationship: RELATIONSHIP[input.status],
    Confession1: NO_CONFESSION,
    Confession2: married ? NO_CONFESSION : 0,
    Children: Array.from({ length: input.children }, () => ({ Age: DEFAULT_CHILD_AGE })),
    Age1: DEFAULT_AGE,
    Age2: married ? DEFAULT_AGE : 0,
    RevenueType1: EMPLOYED,
    Revenue1: bracket,
    RevenueType2: NO_REVENUE,
    Revenue2: 0,
    Fortune: 0,
    Language: LANGUAGE_EN,
    Budget: [],
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let result: EstvDetailedTaxes
  try {
    // The body is part of the cache key, so this caches per
    // (commune, bracket, status, children) for 30 days.
    const res = await fetch(`${ESTV}/API_calculateDetailedTaxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'force-cache',
      next: { revalidate: CACHE_SECONDS },
      signal: controller.signal,
    })
    if (!res.ok) {
      // Status only: the request body carries the income bracket
      console.error(`[tax] ESTV responded ${res.status}`)
      return { ok: false, reason: 'upstream_error' }
    }
    result = ((await res.json()) as { response: EstvDetailedTaxes }).response
  } catch (err) {
    console.error('[tax] ESTV request failed:', err instanceof Error ? err.name : 'unknown error')
    return { ok: false, reason: 'upstream_error' }
  } finally {
    clearTimeout(timeout)
  }

  const fields = [result?.IncomeTaxFed, result?.IncomeTaxCanton, result?.IncomeTaxCity, result?.TotalTax]
  if (!fields.every(v => typeof v === 'number' && Number.isFinite(v))) {
    console.error('[tax] ESTV response missing tax fields')
    return { ok: false, reason: 'upstream_error' }
  }

  return {
    ok: true,
    estimate: {
      taxYear: TAX_YEAR,
      bfsNumber: input.bfsNumber,
      canton,
      incomeBracket: bracket,
      federal: result.IncomeTaxFed,
      cantonal: result.IncomeTaxCanton,
      communal: result.IncomeTaxCity,
      personal: result.PersonalTax ?? 0,
      church: result.IncomeTaxChurch ?? 0,
      totalAnnual: result.TotalTax,
      totalMonthly: round2(result.TotalTax / 12),
      taxableIncome: { federal: result.TaxableIncomeFed, cantonal: result.TaxableIncomeCanton },
      isEstimate: true,
      basis: 'ESTV derives taxable income from gross salary with its standard deductions; '
        + 'actual deductions (pension buy-ins, 3rd pillar, commuting, childcare) will change the result.',
      assumptions: [
        `Gross income rounded to the nearest CHF ${INCOME_BRACKET_STEP.toLocaleString('en-US')}`,
        'Employed; the whole household income is earned by one person (a two-earner couple usually pays less)',
        `Age ${DEFAULT_AGE} (affects the estimated pension contribution deduction)`,
        `Children aged ${DEFAULT_CHILD_AGE}`,
        'No church membership (no church tax), no wealth',
      ],
      source: 'Swiss Federal Tax Administration (ESTV) tax calculator',
    },
  }
}
