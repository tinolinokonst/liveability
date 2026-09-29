// Monthly budget for a household in a commune: gross income minus employee
// social contributions, income tax, mandatory health insurance and rent.
// Server-side (the tax comes from ESTV); used by /api/budget and AI Match, so
// both show the same figures. Client code imports the types only.
//
// The income is never logged or stored here. Tax is computed for the income
// rounded to a CHF 5,000 bracket (see lib/tax.ts); gross income and social
// contributions use the exact figure.

import { estimateIncomeTax, MaritalStatus, TAX_YEAR } from './tax'
import { estimateHealthPremiums, PREMIUM_YEAR } from './healthPremiums'
import { employeeSocialContributions } from './socialContributions'
import { MATCHABLE_AREAS, areaBfsNumber } from './neighborhoods'
import type { Neighborhood } from './types'

export interface HouseholdInput {
  /** Gross annual household income, CHF */
  grossIncome: number
  status: MaritalStatus
  /** Adults aged 26+ (health premiums) */
  adults: number
  /** Children aged 0–18 (health premiums and tax deductions) */
  children: number
}

export const HOUSEHOLD_LIMITS = { maxIncome: 5_000_000, maxAdults: 6, maxChildren: 10 } as const

export function parseHousehold(raw: unknown): { ok: true; value: HouseholdInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'household must be an object' }
  const { grossIncome, status, adults, children } = raw as Record<string, unknown>
  if (typeof grossIncome !== 'number' || !Number.isFinite(grossIncome) || grossIncome <= 0 || grossIncome > HOUSEHOLD_LIMITS.maxIncome) {
    return { ok: false, error: `grossIncome must be a number between 0 and ${HOUSEHOLD_LIMITS.maxIncome}` }
  }
  if (status !== 'single' && status !== 'married') {
    return { ok: false, error: "status must be 'single' or 'married'" }
  }
  if (!Number.isInteger(adults) || (adults as number) < 1 || (adults as number) > HOUSEHOLD_LIMITS.maxAdults) {
    return { ok: false, error: `adults must be an integer from 1 to ${HOUSEHOLD_LIMITS.maxAdults}` }
  }
  if (!Number.isInteger(children) || (children as number) < 0 || (children as number) > HOUSEHOLD_LIMITS.maxChildren) {
    return { ok: false, error: `children must be an integer from 0 to ${HOUSEHOLD_LIMITS.maxChildren}` }
  }
  return { ok: true, value: { grossIncome, status, adults: adults as number, children: children as number } }
}

export interface MonthlyBudget {
  bfsNumber: number
  canton: string
  grossMonthly: number
  social: { monthly: number; ahvIvEoAnnual: number; alvAnnual: number; year: number }
  tax: {
    monthly: number
    annual: number
    federal: number
    cantonal: number
    communal: number
    /** Flat per-head tax some cantons levy; included in annual */
    personal: number
    taxYear: number
    incomeBracket: number
  }
  health: { monthly: number; premiumYear: number; adultMonthly: number; childMonthly: number }
  /** outsideCoverage: the location is not in a covered area, so the nearest one's rent is used */
  rent: { monthly: number; area: string; distanceKm: number; outsideCoverage: boolean }
  leftMonthly: number
  assumptions: string[]
}

export type BudgetResult =
  | { ok: true; budget: MonthlyBudget }
  | { ok: false; reason: 'unknown_commune' | 'upstream_error' }

const round = (n: number) => Math.round(n)

// Rent covers 59 city/district areas only. Beyond this distance from the
// nearest area's center the location is clearly outside it (e.g. Zug → a
// Zürich district 22 km away), and the rent line says so.
const RENT_COVERAGE_KM = 5

export async function computeMonthlyBudget(params: {
  bfsNumber: number
  household: HouseholdInput
  rent: { monthly: number; area: string; distanceKm?: number }
}): Promise<BudgetResult> {
  const { bfsNumber, household } = params
  const distanceKm = Math.round((params.rent.distanceKm ?? 0) * 10) / 10
  const rent = { ...params.rent, distanceKm, outsideCoverage: distanceKm > RENT_COVERAGE_KM }

  const health = estimateHealthPremiums(bfsNumber, { adults: household.adults, youngAdults: 0, children: household.children })
  if (!health) return { ok: false, reason: 'unknown_commune' }

  const tax = await estimateIncomeTax({
    bfsNumber,
    grossIncome: household.grossIncome,
    status: household.status,
    children: household.children,
  })
  if (!tax.ok) return { ok: false, reason: tax.reason }
  const t = tax.estimate

  const social = employeeSocialContributions(household.grossIncome)
  const grossMonthly = household.grossIncome / 12
  const socialMonthly = social.total / 12
  const taxMonthly = t.totalAnnual / 12

  return {
    ok: true,
    budget: {
      bfsNumber,
      canton: t.canton,
      grossMonthly: round(grossMonthly),
      social: { monthly: round(socialMonthly), ahvIvEoAnnual: round(social.ahvIvEo), alvAnnual: round(social.alv), year: social.year },
      tax: {
        monthly: round(taxMonthly),
        annual: t.totalAnnual,
        federal: t.federal,
        cantonal: t.cantonal,
        communal: t.communal,
        personal: t.personal,
        taxYear: t.taxYear,
        incomeBracket: t.incomeBracket,
      },
      health: {
        monthly: round(health.monthlyTotal),
        premiumYear: health.premiumYear,
        adultMonthly: health.perPerson.adult,
        childMonthly: health.perPerson.child,
      },
      rent,
      // Rounded once from unrounded parts, so the lines can differ from it by a franc
      leftMonthly: round(grossMonthly - socialMonthly - taxMonthly - health.monthlyTotal - rent.monthly),
      assumptions: [
        ...t.assumptions,
        'Pension (BVG) and non-occupational accident insurance not deducted',
        `Health insurance: average ${health.premiumYear} premium for the standard model, CHF 300 deductible for adults, accident cover included; all adults counted as 26+`,
        rent.outsideCoverage
          ? `Rent: no rent data for this location; uses the nearest covered area (${rent.area}, ${Math.round(rent.distanceKm)} km away), so treat it as a rough placeholder`
          : 'Rent: area-level estimate, not a listing for this address',
      ],
    },
  }
}

export interface AreaMonthlyBudget {
  incomeTax: number
  incomeTaxPerYear: number
  healthInsurance: number
  socialContributions: number
  rent: number
  leftOver: number
}

/**
 * Monthly budget for every matchable area, for AI Match. Tax and premiums are
 * per commune, so this computes one budget per commune (12, each ESTV call
 * cached) and subtracts each area's own rent. Areas whose commune fails are
 * left out of the map.
 */
export async function areaMonthlyBudgets(household: HouseholdInput): Promise<Map<Neighborhood, AreaMonthlyBudget>> {
  const communes = [...new Set(MATCHABLE_AREAS.map(areaBfsNumber))]
  const base = new Map<number, MonthlyBudget>()
  await Promise.all(communes.map(async bfsNumber => {
    const r = await computeMonthlyBudget({ bfsNumber, household, rent: { monthly: 0, area: '' } })
    if (r.ok) base.set(bfsNumber, r.budget)
  }))

  const out = new Map<Neighborhood, AreaMonthlyBudget>()
  for (const n of MATCHABLE_AREAS) {
    const b = base.get(areaBfsNumber(n))
    if (!b) continue
    out.set(n, {
      incomeTax: b.tax.monthly,
      incomeTaxPerYear: b.tax.annual,
      healthInsurance: b.health.monthly,
      socialContributions: b.social.monthly,
      rent: n.rent,
      leftOver: b.leftMonthly - n.rent,
    })
  }
  return out
}

export { TAX_YEAR, PREMIUM_YEAR }
