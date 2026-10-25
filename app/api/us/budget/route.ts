import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { usEnabled } from '@/lib/flags'
import { readJsonBody } from '@/lib/validate'
import { parseHousehold } from '@/lib/budget'
import { computeUsBudget } from '@/lib/usBudget'
import { getUsRent } from '@/lib/usCommunitySources'
import { censusUnits } from '@/lib/usGeography'
import { parseUsCoords } from '@/lib/usUpstream'

// US monthly budget for a household at a location: gross income − FICA −
// federal and state income tax − HUD Fair Market Rent. See lib/usBudget.ts.
//
// POST, never GET: the body carries the household income, and query strings
// end up in access logs. Nothing here logs or stores the income.
// Body: { lat, lng, household: { grossIncome, status, adults, children } }
export async function POST(request: NextRequest) {
  if (!usEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const guard = await guardRequest('us-budget', 120, 3600)
  if ('response' in guard) return guard.response

  const body = await readJsonBody(request)
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: 400 })
  const raw = (body.value ?? {}) as Record<string, unknown>

  const coords = parseUsCoords(String(raw.lat ?? ''), String(raw.lng ?? ''))
  if (!coords) return NextResponse.json({ error: 'Valid US lat and lng are required' }, { status: 400 })

  const household = parseHousehold(raw.household)
  if (!household.ok) return NextResponse.json({ error: household.error }, { status: 400 })

  let units
  try {
    units = await censusUnits(coords.lat, coords.lng)
  } catch {
    return NextResponse.json({ error: 'Could not resolve the state for this location, try again later' }, { status: 502 })
  }
  const rent = await getUsRent(coords.lat, coords.lng)

  const budget = computeUsBudget({
    stateAbbr: units.stateAbbr,
    household: household.value,
    rent: rent.status === 'ok' && rent.byBedrooms
      ? {
          byBedrooms: rent.byBedrooms,
          level: rent.level ?? 'area',
          label: rent.level === 'zip' ? `ZIP ${rent.zip}` : rent.areaName ?? 'Metro area',
          fiscalYear: rent.fiscalYear,
        }
      : null,
  })
  if (!budget) return NextResponse.json({ error: 'No tax data for this state' }, { status: 404 })
  return NextResponse.json(budget)
}
