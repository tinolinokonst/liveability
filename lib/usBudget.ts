// US monthly budget: gross income − FICA − federal income tax − state income
// tax − HUD Fair Market Rent. The counterpart of lib/budget.ts (Switzerland),
// with the same privacy rules: the income arrives only in POST bodies, is
// never logged or stored, and the figures are masked in session replays.
//
// Pure functions over static tables (lib/data/us-federal-tax.json,
// lib/data/us-state-income-tax.json), so AI Match can compute one budget per
// area without a network call. Deliberately simple, and it says so: wages
// only, the standard deduction, no pre-tax contributions, no local taxes.

import federal from './data/us-federal-tax.json'
import stateTable from './data/us-state-income-tax.json'
import type { HouseholdInput } from './budget'

type Bracket = [number, number]
type Status = 'single' | 'married'
interface Amount { deduction?: number; credit?: number }
interface StateEntry {
  wageTax: boolean
  single: Bracket[]
  married: Bracket[]
  standardDeduction: Record<Status, Amount | null>
  personal: { single: Amount | null; married: Amount | null; dependent: Amount | null }
  notes: string[]
  simplified: string[]
}

const STATES = (stateTable as unknown as { states: Record<string, StateEntry> }).states
export const US_TAX_YEAR = federal.year
export const STATE_TAX_SOURCE = { label: (stateTable as { source: string }).source, url: (stateTable as { sourceUrl: string }).sourceUrl }
export const FEDERAL_TAX_SOURCES = federal.sources

const round = (n: number) => Math.round(n)
const pct = (rate: number) => `${Number((rate * 100).toFixed(2))} %`

/** Progressive tax: each rate applies to the income between its threshold and the next */
export function bracketTax(taxable: number, brackets: Bracket[]): number {
  let tax = 0
  for (let i = 0; i < brackets.length; i++) {
    const [from, rate] = brackets[i]
    const to = brackets[i + 1]?.[0] ?? Infinity
    if (taxable <= from) break
    tax += (Math.min(taxable, to) - from) * rate
  }
  return tax
}

export function federalIncomeTax(income: number, status: Status, children: number): { tax: number; childCredit: number } {
  const taxable = Math.max(0, income - federal.standardDeduction[status])
  const before = bracketTax(taxable, federal.brackets[status] as Bracket[])
  const ctc = federal.childTaxCredit
  const over = Math.max(0, income - ctc.phaseoutStart[status])
  const credit = Math.max(0, children * ctc.perChild - Math.ceil(over / 1000) * ctc.phaseoutPer1000)
  // The credit first cancels tax; up to $1,700 per child of the rest is paid out
  const used = Math.min(before, credit)
  const refundable = Math.min(credit - used, children * ctc.refundablePerChild, Math.max(0, income - ctc.refundableEarnedIncomeFloor) * ctc.refundableRate)
  return { tax: before - used - refundable, childCredit: used + refundable }
}

export function fica(income: number, status: Status): { socialSecurity: number; medicare: number } {
  const f = federal.fica
  return {
    socialSecurity: Math.min(income, f.socialSecurityWageBase) * f.socialSecurityRate,
    medicare: income * f.medicareRate + Math.max(0, income - f.additionalMedicareThreshold[status]) * f.additionalMedicareRate,
  }
}

export function stateIncomeTax(stateAbbr: string, income: number, status: Status, children: number): { tax: number; known: boolean } {
  const s = STATES[stateAbbr]
  if (!s) return { tax: 0, known: false }
  if (!s.wageTax) return { tax: 0, known: true }
  const personal = s.personal[status]
  const deductions = (s.standardDeduction[status]?.deduction ?? 0) + (personal?.deduction ?? 0) + children * (s.personal.dependent?.deduction ?? 0)
  const credits = (personal?.credit ?? 0) + children * (s.personal.dependent?.credit ?? 0)
  const tax = bracketTax(Math.max(0, income - deductions), s[status]) - credits
  return { tax: Math.max(0, tax), known: true }
}

/** HUD's occupancy guideline of two people per bedroom, between 1 and 4 bedrooms */
export function bedroomsFor(h: Pick<HouseholdInput, 'adults' | 'children'>): number {
  return Math.min(4, Math.max(1, Math.ceil(h.adults / 2) + Math.ceil(h.children / 2)))
}

export interface UsMonthlyBudget {
  state: string
  grossMonthly: number
  fica: { monthly: number; socialSecurityAnnual: number; medicareAnnual: number }
  federalTax: { monthly: number; annual: number; childCreditAnnual: number }
  stateTax: { monthly: number; annual: number }
  rent: { monthly: number; bedrooms: number; level: 'zip' | 'area'; label: string; fiscalYear: string } | null
  leftMonthly: number
  taxYear: number
  assumptions: string[]
  /** Rules for this state the estimate leaves out, in the source's words */
  stateCaveats: string[]
}

export function computeUsBudget(params: {
  stateAbbr: string
  household: HouseholdInput
  rent: { byBedrooms: number[]; level: 'zip' | 'area'; label: string; fiscalYear: string } | null
}): UsMonthlyBudget | null {
  const { stateAbbr, household } = params
  const status = household.status
  const income = household.grossIncome
  const st = STATES[stateAbbr]
  if (!st) return null

  const f = fica(income, status)
  const fed = federalIncomeTax(income, status, household.children)
  const state = stateIncomeTax(stateAbbr, income, status, household.children)
  const bedrooms = bedroomsFor(household)
  const rentMonthly = params.rent ? params.rent.byBedrooms[bedrooms] : null

  const ficaAnnual = f.socialSecurity + f.medicare
  const left = income / 12 - ficaAnnual / 12 - fed.tax / 12 - state.tax / 12 - (rentMonthly ?? 0)

  return {
    state: stateAbbr,
    grossMonthly: round(income / 12),
    fica: { monthly: round(ficaAnnual / 12), socialSecurityAnnual: round(f.socialSecurity), medicareAnnual: round(f.medicare) },
    federalTax: { monthly: round(fed.tax / 12), annual: round(fed.tax), childCreditAnnual: round(fed.childCredit) },
    stateTax: { monthly: round(state.tax / 12), annual: round(state.tax) },
    rent: params.rent && rentMonthly !== null
      ? { monthly: rentMonthly, bedrooms, level: params.rent.level, label: params.rent.label, fiscalYear: params.rent.fiscalYear }
      : null,
    leftMonthly: round(left),
    taxYear: US_TAX_YEAR,
    assumptions: [
      `${US_TAX_YEAR} federal brackets and standard deduction${status === 'married' ? ' (married filing jointly)' : ' (single filer; head-of-household filing, which can lower tax for single parents, isn\'t modeled)'}`,
      'All income treated as wages; no 401(k), HSA or other pre-tax contributions, no itemized deductions',
      household.children ? `Child Tax Credit: $${federal.childTaxCredit.perChild.toLocaleString('en-US')} per child, all children assumed under 17` : 'No dependents',
      `FICA: Social Security ${pct(federal.fica.socialSecurityRate)} up to $${federal.fica.socialSecurityWageBase.toLocaleString('en-US')} and Medicare ${pct(federal.fica.medicareRate)} (plus ${pct(federal.fica.additionalMedicareRate)} above the threshold), computed as if one person earns all of it`,
      st.wageTax
        ? `${stateAbbr} income tax: ${US_TAX_YEAR} brackets, standard deduction and personal exemptions from the Tax Foundation table`
        : `${stateAbbr} has no state income tax on wages`,
      ...(st.notes.includes('a') ? ['Local (city or county) income taxes, such as New York City\'s, are not included'] : []),
      params.rent && rentMonthly !== null
        ? `Rent: HUD Fair Market Rent for a ${bedrooms === 0 ? 'studio' : `${bedrooms}-bedroom`} unit (${bedrooms > 1 ? 'two people per bedroom' : 'one bedroom'}) — a market estimate including basic utilities, not a listing price`
        : 'Rent: no HUD Fair Market Rent for this location, so none is subtracted',
    ],
    stateCaveats: st.simplified,
  }
}
