/**
 * Debug check for the cost-of-living data layer: tax (ESTV), health premiums
 * (FOPH) and social contributions, for three reference households. Calls the
 * library functions directly, so no logged-in session is needed.
 *
 *   npx tsx scripts/verify-cost-data.ts
 *
 * Also cross-checks lib/socialContributions against the AHV/IV/EO and ALV
 * amounts ESTV itself deducts for the same salaries (incl. one above the ALV
 * ceiling), which catches a stale rate or ceiling.
 */
import { estimateIncomeTax, estvLocation, incomeBracket, TAX_YEAR, TaxInput } from '../lib/tax'
import { estimateHealthPremiums, Household } from '../lib/healthPremiums'
import { employeeSocialContributions } from '../lib/socialContributions'

const ESTV = 'https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV'
const ZURICH = 261
const ZUG = 1711

const CASES: Array<{ label: string; tax: TaxInput; household: Household }> = [
  {
    label: 'Single, CHF 100k, Zürich city',
    tax: { bfsNumber: ZURICH, grossIncome: 100_000, status: 'single', children: 0 },
    household: { adults: 1, youngAdults: 0, children: 0 },
  },
  {
    label: 'Married, 2 kids, CHF 180k, Zürich city',
    tax: { bfsNumber: ZURICH, grossIncome: 180_000, status: 'married', children: 2 },
    household: { adults: 2, youngAdults: 0, children: 2 },
  },
  {
    label: 'Married, 2 kids, CHF 180k, Zug',
    tax: { bfsNumber: ZUG, grossIncome: 180_000, status: 'married', children: 2 },
    household: { adults: 2, youngAdults: 0, children: 2 },
  },
]

const chf = (n: number) => `CHF ${n.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

/** What ESTV itself deducts as AHV/IV/EO and ALV for a gross salary */
async function estvSocial(bfs: number, salary: number) {
  const res = await fetch(`${ESTV}/API_calculateDetailedTaxes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      SimKey: null, TaxYear: TAX_YEAR, TaxLocationID: estvLocation(bfs)!.taxLocationId, Relationship: 1, Confession1: 4,
      Confession2: 0, Children: [], Age1: 35, Age2: 0, RevenueType1: 1, Revenue1: salary,
      RevenueType2: 0, Revenue2: 0, Fortune: 0, Language: 4, Budget: [],
    }),
  })
  const p1 = ((await res.json()) as { response: { IncomeP1: { AIOContribution: number; ALVContribution: number } } })
    .response.IncomeP1
  return { ahvIvEo: p1.AIOContribution, alv: p1.ALVContribution }
}

async function main() {
  let failures = 0
  const check = (label: string, ok: boolean, detail: string) => {
    if (!ok) failures++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(44)} ${detail}`)
  }

  for (const c of CASES) {
    console.log(`\n=== ${c.label}`)
    const tax = await estimateIncomeTax(c.tax)
    if (!tax.ok) {
      check('tax', false, tax.reason)
      continue
    }
    const t = tax.estimate
    console.log(`Tax ${t.taxYear} (bracket ${chf(t.incomeBracket)}; taxable fed ${chf(t.taxableIncome.federal)}, cant ${chf(t.taxableIncome.cantonal)})`)
    console.log(`  federal  ${chf(t.federal)}`)
    console.log(`  cantonal ${chf(t.cantonal)}`)
    console.log(`  communal ${chf(t.communal)}`)
    if (t.personal) console.log(`  personal ${chf(t.personal)}`)
    console.log(`  TOTAL    ${chf(t.totalAnnual)} / yr   ${chf(t.totalMonthly)} / mo`)
    check('tax components add up to total', Math.abs(t.federal + t.cantonal + t.communal + t.personal + t.church - t.totalAnnual) < 1,
      `${t.federal}+${t.cantonal}+${t.communal}+${t.personal}+${t.church}`)
    check('no church tax', t.church === 0, chf(t.church))

    const hp = estimateHealthPremiums(c.tax.bfsNumber, c.household)
    if (!hp) {
      check('health premiums', false, 'no region')
      continue
    }
    console.log(`Health ${hp.premiumYear} (${hp.canton} region ${hp.premiumRegion}; adult ${chf(hp.perPerson.adult)}, child ${chf(hp.perPerson.child)})`)
    console.log(`  TOTAL    ${chf(hp.monthlyTotal)} / mo   ${chf(hp.annualTotal)} / yr`)

    const sc = employeeSocialContributions(t.incomeBracket)
    console.log(`Social contributions (employee, excl. BVG/NBU)`)
    console.log(`  AHV/IV/EO ${chf(sc.ahvIvEo)}  ALV ${chf(sc.alv)}  TOTAL ${chf(sc.total)} / yr   ${chf(sc.totalMonthly)} / mo`)
  }

  console.log('\n=== Social contributions vs ESTV\'s own deductions')
  for (const salary of [100_000, 180_000, 250_000]) {
    const ours = employeeSocialContributions(salary)
    const estv = await estvSocial(ZURICH, salary)
    check(`CHF ${salary.toLocaleString('de-CH')}: AHV/IV/EO`, Math.abs(ours.ahvIvEo - estv.ahvIvEo) <= 1, `ours ${ours.ahvIvEo}  ESTV ${estv.ahvIvEo}`)
    check(`CHF ${salary.toLocaleString('de-CH')}: ALV (ceiling 148,200)`, Math.abs(ours.alv - estv.alv) <= 1, `ours ${ours.alv}  ESTV ${estv.alv}`)
  }

  console.log('\n=== Edge cases')
  check('unknown BFS → unknown_commune', (await estimateIncomeTax({ bfsNumber: 99999, grossIncome: 1, status: 'single', children: 0 })).ok === false, '')
  check('unknown BFS → no premiums', estimateHealthPremiums(99999, { adults: 1, youngAdults: 0, children: 0 }) === null, '')
  check('income bracket rounds to 5k', incomeBracket(102_499) === 100_000 && incomeBracket(102_500) === 105_000, `${incomeBracket(102_499)} / ${incomeBracket(102_500)}`)

  console.log(failures === 0 ? '\nRESULT: all checks passed' : `\nRESULT: ${failures} FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main()
