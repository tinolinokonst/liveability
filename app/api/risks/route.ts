import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'
import { getContamination, getHazards } from '@/lib/riskSources'
import type { RisksResult } from '@/lib/types'

// Natural hazards + contaminated sites for one address. Each half degrades on
// its own: a failure or an uncovered canton in one never hides the other.
export async function GET(request: NextRequest) {
  const guard = await guardRequest('risks', 60, 3600)
  if ('response' in guard) return guard.response

  const coords = parseCoords(request.nextUrl.searchParams.get('lat'), request.nextUrl.searchParams.get('lng'))
  if (!coords) {
    return NextResponse.json({ error: 'Valid Switzerland lat and lng are required' }, { status: 400 })
  }

  const [hazards, contamination] = await Promise.all([
    getHazards(coords.lat, coords.lng),
    getContamination(coords.lat, coords.lng),
  ])
  return NextResponse.json({ hazards, contamination } satisfies RisksResult)
}
