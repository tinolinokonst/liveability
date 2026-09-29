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
import { areaMonthlyBudgets, computeMonthlyBudget, HouseholdInput } from '../lib/budget'
import { findCommune } from '../lib/geoAdmin'
import { MATCHABLE_AREAS, areaBfsNumber, areaDisplayName, haversineKm, nearestMatchableArea } from '../lib/neighborhoods'

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

  // Same path as /api/budget: coordinate → commune (geo.admin) → area rent → budget
  console.log('\n=== Monthly budget, end to end (real addresses)')
  const ADDRESSES = {
    zurich: { label: 'Bahnhofstrasse 1, 8001 Zürich', lat: 47.3667, lng: 8.5390, bfs: ZURICH },
    zug: { label: 'Bahnhofplatz, 6300 Zug', lat: 47.1737, lng: 8.5153, bfs: ZUG },
  }
  const BUDGET_CASES: Array<{ label: string; at: keyof typeof ADDRESSES; household: HouseholdInput }> = [
    { label: 'Single, CHF 100k, Zürich', at: 'zurich', household: { grossIncome: 100_000, status: 'single', adults: 1, children: 0 } },
    { label: 'Married, 2 kids, CHF 180k, Zürich', at: 'zurich', household: { grossIncome: 180_000, status: 'married', adults: 2, children: 2 } },
    { label: 'Married, 2 kids, CHF 180k, Zug', at: 'zug', household: { grossIncome: 180_000, status: 'married', adults: 2, children: 2 } },
  ]
  const left: Record<string, number> = {}
  for (const c of BUDGET_CASES) {
    const a = ADDRESSES[c.at]
    const commune = await findCommune(a.lat, a.lng)
    check(`${a.label} → BFS ${a.bfs}`, commune?.bfsNumber === a.bfs, `${commune?.commune} (${commune?.bfsNumber})`)
    const area = nearestMatchableArea(a.lat, a.lng)
    const r = await computeMonthlyBudget({
      bfsNumber: commune!.bfsNumber,
      household: c.household,
      rent: { monthly: area.rent, area: areaDisplayName(area), distanceKm: haversineKm(a.lat, a.lng, area.lat, area.lng) },
    })
    if (!r.ok) { check(c.label, false, r.reason); continue }
    const b = r.budget
    console.log(`\n${c.label}`)
    console.log(`  Gross monthly income        ${chf(b.grossMonthly)}`)
    console.log(`  − Social contributions      ${chf(b.social.monthly)}`)
    console.log(`  − Income tax (${b.tax.taxYear})         ${chf(b.tax.monthly)}   (${chf(b.tax.annual)}/yr)`)
    console.log(`  − Health insurance (${b.health.premiumYear})   ${chf(b.health.monthly)}`)
    console.log(`  − Rent estimate             ${chf(b.rent.monthly)}   (${b.rent.area}, ${b.rent.distanceKm} km${b.rent.outsideCoverage ? ' — OUTSIDE rent coverage' : ''})`)
    console.log(`  = Left each month           ${chf(b.leftMonthly)}`)
    const parts = b.grossMonthly - b.social.monthly - b.tax.monthly - b.health.monthly - b.rent.monthly
    check('lines add up to the total (±2 rounding)', Math.abs(parts - b.leftMonthly) <= 2, `${parts} vs ${b.leftMonthly}`)
    const annualTax = (await estimateIncomeTax({ bfsNumber: a.bfs, grossIncome: c.household.grossIncome, status: c.household.status, children: c.household.children }))
    check('tax matches the verified ESTV figure', annualTax.ok && annualTax.estimate.totalAnnual === b.tax.annual, `${b.tax.annual}`)
    left[c.label] = b.leftMonthly
  }
  const diff = left['Married, 2 kids, CHF 180k, Zug'] - left['Married, 2 kids, CHF 180k, Zürich']
  console.log(`\nHeadline (married, 2 kids, CHF 180k): ${chf(Math.round(diff / 10) * 10)}/month more left over in Zug than in Zürich`)

  console.log('\n=== Area → commune mapping used by AI Match')
  let areaMismatches = 0
  for (const n of MATCHABLE_AREAS) {
    const c = await findCommune(n.lat, n.lng)
    if (c?.bfsNumber !== areaBfsNumber(n)) { areaMismatches++; console.log(`  ${areaDisplayName(n)}: expected ${areaBfsNumber(n)}, got ${c?.bfsNumber}`) }
  }
  check(`all ${MATCHABLE_AREAS.length} area centers in their commune`, areaMismatches === 0, `${areaMismatches} mismatches`)

  // The per-area figures AI Match gives the model
  console.log('\n=== AI Match area budgets (married, 2 kids, CHF 180k)')
  const areaBudgets = await areaMonthlyBudgets({ grossIncome: 180_000, status: 'married', adults: 2, children: 2 })
  check(`budget for all ${MATCHABLE_AREAS.length} areas`, areaBudgets.size === MATCHABLE_AREAS.length, `${areaBudgets.size}`)
  const kreis1 = MATCHABLE_AREAS.find(n => n.name.startsWith('Kreis 1 '))!
  check('Kreis 1 matches the address-level figure', areaBudgets.get(kreis1)?.leftOver === left['Married, 2 kids, CHF 180k, Zürich'],
    `${areaBudgets.get(kreis1)?.leftOver} vs ${left['Married, 2 kids, CHF 180k, Zürich']}`)
  const ranked = [...areaBudgets.entries()].sort((a, b) => b[1].leftOver - a[1].leftOver)
  console.log('  Most left over:  ' + ranked.slice(0, 3).map(([n, b]) => `${areaDisplayName(n)} ${chf(b.leftOver)}`).join('; '))
  console.log('  Least left over: ' + ranked.slice(-3).map(([n, b]) => `${areaDisplayName(n)} ${chf(b.leftOver)}`).join('; '))
  const lowestTax = [...areaBudgets.entries()].sort((a, b) => a[1].incomeTaxPerYear - b[1].incomeTaxPerYear)[0]
  console.log(`  Lowest tax:      ${areaDisplayName(lowestTax[0])} ${chf(lowestTax[1].incomeTaxPerYear)}/yr`)

  console.log('\n=== Edge cases')
  check('unknown BFS → unknown_commune', (await estimateIncomeTax({ bfsNumber: 99999, grossIncome: 1, status: 'single', children: 0 })).ok === false, '')
  check('unknown BFS → no premiums', estimateHealthPremiums(99999, { adults: 1, youngAdults: 0, children: 0 }) === null, '')
  check('income bracket rounds to 5k', incomeBracket(102_499) === 100_000 && incomeBracket(102_500) === 105_000, `${incomeBracket(102_499)} / ${incomeBracket(102_500)}`)

  console.log(failures === 0 ? '\nRESULT: all checks passed' : `\nRESULT: ${failures} FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main()
