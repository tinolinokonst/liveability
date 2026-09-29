import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { readJsonBody } from '@/lib/validate'
import { parseCoords } from '@/lib/coords'
import { findCommune } from '@/lib/geoAdmin'
import { areaDisplayName, haversineKm, nearestMatchableArea } from '@/lib/neighborhoods'
import { computeMonthlyBudget, parseHousehold } from '@/lib/budget'

// Monthly budget for a household at a location: gross income − social
// contributions − income tax − health insurance − rent. See lib/budget.ts.
//
// POST, never GET: the body carries the household income, and query strings
// end up in access logs. Nothing here logs or stores the income.
// Body: { lat, lng, bfsNumber?, household: { grossIncome, status, adults, children } }
// bfsNumber is optional; without it the commune is resolved from the coordinate.

export async function POST(request: NextRequest) {
  const guard = await guardRequest('budget', 120, 3600)
  if ('response' in guard) return guard.response

  const body = await readJsonBody(request)
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: 400 })
  const raw = (body.value ?? {}) as Record<string, unknown>

  const coords = parseCoords(String(raw.lat ?? ''), String(raw.lng ?? ''))
  if (!coords) return NextResponse.json({ error: 'Valid Switzerland lat and lng are required' }, { status: 400 })

  const household = parseHousehold(raw.household)
  if (!household.ok) return NextResponse.json({ error: household.error }, { status: 400 })

  let bfsNumber = Number.isInteger(raw.bfsNumber) && (raw.bfsNumber as number) > 0 ? (raw.bfsNumber as number) : null
  if (bfsNumber === null) {
    const commune = await findCommune(coords.lat, coords.lng)
    if (!commune) return NextResponse.json({ error: 'Could not resolve the commune for this location' }, { status: 404 })
    bfsNumber = commune.bfsNumber
  }

  // Same area-level rent estimate the Cost of Living card shows (/api/rentcast)
  const area = nearestMatchableArea(coords.lat, coords.lng)

  const result = await computeMonthlyBudget({
    bfsNumber,
    household: household.value,
    rent: {
      monthly: area.rent,
      area: areaDisplayName(area),
      distanceKm: haversineKm(coords.lat, coords.lng, area.lat, area.lng),
    },
  })
  if (!result.ok) {
    return result.reason === 'unknown_commune'
      ? NextResponse.json({ error: 'No tax or premium data for this commune' }, { status: 404 })
      : NextResponse.json({ error: 'Tax calculator unavailable, try again later' }, { status: 502 })
  }
  return NextResponse.json(result.budget)
}
