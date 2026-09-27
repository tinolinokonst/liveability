// Employee share of Swiss federal social insurance contributions on salary.
//
// Rates for 2026, from the Informationsstelle AHV/IV memos:
//  - 2.01 "Lohnbeiträge an die AHV, die IV und die EO", Stand 1.1.2026:
//    AHV 8.7 %, IV 1.4 %, EO 0.5 % = 10.6 %, split equally → 5.3 % employee.
//  - 2.08 "Beiträge an die Arbeitslosenversicherung": ALV 2.2 % up to
//    CHF 148,200 a year per employment, split equally → 1.1 % employee; since
//    1.1.2023 nothing is due on salary above the ceiling.
//
// Deliberately excluded, because they depend on the employer's plan:
//  - occupational pension (BVG / 2nd pillar)
//  - non-occupational accident insurance (NBU)

export const SOCIAL_CONTRIBUTION_YEAR = 2026

const AHV_IV_EO_EMPLOYEE_RATE = 0.053
const ALV_EMPLOYEE_RATE = 0.011
/** Maximum annual salary subject to ALV, per employment relationship. */
export const ALV_SALARY_CEILING = 148_200

export interface SocialContributions {
  /** AHV/IV/EO (old-age, disability, loss of earnings), employee share, CHF/year */
  ahvIvEo: number
  /** ALV (unemployment), employee share, CHF/year */
  alv: number
  total: number
  totalMonthly: number
  year: number
  excluded: string[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Employee contributions for one employment's gross annual salary. The ALV
 * ceiling applies per employment, so a two-earner household should call this
 * once per salary and add the results.
 */
export function employeeSocialContributions(annualGrossSalary: number): SocialContributions {
  const salary = Math.max(0, annualGrossSalary)
  const ahvIvEo = round2(salary * AHV_IV_EO_EMPLOYEE_RATE)
  const alv = round2(Math.min(salary, ALV_SALARY_CEILING) * ALV_EMPLOYEE_RATE)
  const total = round2(ahvIvEo + alv)
  return {
    ahvIvEo,
    alv,
    total,
    totalMonthly: round2(total / 12),
    year: SOCIAL_CONTRIBUTION_YEAR,
    excluded: [
      'Occupational pension (BVG): depends on the employer’s pension plan',
      'Non-occupational accident insurance (NBU): premium set by the employer’s insurer',
    ],
  }
}
