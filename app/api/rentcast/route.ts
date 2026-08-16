import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'
import { areaDisplayName, nearestMatchableArea } from '@/lib/neighborhoods'

// Rent estimates for Swiss addresses.
//
// Rentcast (US-only) previously backed this route; that client has been removed
// along with the rest of the US-era integrations. Estimates now come from the
// area-level cost tiers in lib/neighborhoods.ts — district-level for Zürich,
// Geneva, Basel, Lausanne and Bern, city-level elsewhere — and are always
// labeled as estimates in the UI.
//
// Query params:
//   mode=estimate  → area rent estimate (default)
//   mode=listings  → active rental listings (no Swiss source yet; returns [])
//   lat=...&lng=...→ coordinate to resolve the area from

export async function GET(request: NextRequest) {
  const guard = await guardRequest('rentcast', 30, 3600)
  if ('response' in guard) return guard.response

  const sp = request.nextUrl.searchParams
  const mode = sp.get('mode') ?? 'estimate'

  // No live rental-listings source for Switzerland yet
  if (mode === 'listings') {
    return NextResponse.json([])
  }

  const coords = parseCoords(sp.get('lat'), sp.get('lng'))
  if (!coords) {
    return NextResponse.json(
      { error: 'Valid Switzerland lat and lng are required for rent estimates' },
      { status: 400 }
    )
  }

  const area = nearestMatchableArea(coords.lat, coords.lng)

  return NextResponse.json({
    rent: area.rent,
    rentRangeLow: Math.round(area.rent * 0.85),
    rentRangeHigh: Math.round(area.rent * 1.15),
    city: areaDisplayName(area),
    estimated: true,
    source: 'Area-level average, estimated',
  })
}
