import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'
import { radonEnabled } from '@/lib/flags'
import { getRadon } from '@/lib/radonSource'

export async function GET(request: NextRequest) {
  // Feature off: indistinguishable from a route that doesn't exist
  if (!radonEnabled()) return new NextResponse(null, { status: 404 })

  const guard = await guardRequest('radon', 60, 3600)
  if ('response' in guard) return guard.response

  const coords = parseCoords(request.nextUrl.searchParams.get('lat'), request.nextUrl.searchParams.get('lng'))
  if (!coords) {
    return NextResponse.json({ error: 'Valid Switzerland lat and lng are required' }, { status: 400 })
  }
  return NextResponse.json(await getRadon(coords.lat, coords.lng))
}
