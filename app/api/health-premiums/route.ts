import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { estimateHealthPremiums } from '@/lib/healthPremiums'

// Monthly mandatory basic health insurance (OKP) cost for a household in a
// commune: FOPH regional average premiums, imported into lib/data by
// scripts/build-health-premiums.py. See lib/healthPremiums.ts.
//
// GET /api/health-premiums?bfsNumber=261&adults=2&youngAdults=0&children=2

const MAX_PEOPLE_PER_CLASS = 10

function parseCount(raw: string | null): number | null {
  if (raw === null || raw === '') return 0
  if (!/^\d{1,2}$/.test(raw)) return null
  const n = Number(raw)
  return n <= MAX_PEOPLE_PER_CLASS ? n : null
}

export async function GET(request: NextRequest) {
  const guard = await guardRequest('health-premiums', 120, 3600)
  if ('response' in guard) return guard.response

  const params = request.nextUrl.searchParams
  const bfsRaw = params.get('bfsNumber') ?? ''
  const bfsNumber = /^\d{1,5}$/.test(bfsRaw) ? Number(bfsRaw) : NaN
  const adults = parseCount(params.get('adults'))
  const youngAdults = parseCount(params.get('youngAdults'))
  const children = parseCount(params.get('children'))

  if (!Number.isInteger(bfsNumber) || bfsNumber <= 0) {
    return NextResponse.json({ error: 'bfsNumber must be a positive integer' }, { status: 400 })
  }
  if (adults === null || youngAdults === null || children === null) {
    return NextResponse.json(
      { error: `adults, youngAdults and children must be integers from 0 to ${MAX_PEOPLE_PER_CLASS}` },
      { status: 400 }
    )
  }
  if (adults + youngAdults + children === 0) {
    return NextResponse.json({ error: 'The household needs at least one person' }, { status: 400 })
  }

  const estimate = estimateHealthPremiums(bfsNumber, { adults, youngAdults, children })
  if (!estimate) {
    return NextResponse.json({ error: 'No premium region for this BFS number' }, { status: 404 })
  }
  return NextResponse.json(estimate)
}
