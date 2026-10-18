import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from './apiGuard'
import { usEnabled } from './flags'
import { parseUsCoords } from './usUpstream'

/**
 * Entry check shared by the /api/us/* routes: the routes don't exist while
 * US_ENABLED is off, need a signed-in caller like every metric route, and
 * only answer for coordinates in the US.
 */
export async function usRouteGuard(
  request: NextRequest,
  route: string,
  limitPerHour = 60
): Promise<{ lat: number; lng: number } | { response: NextResponse }> {
  if (!usEnabled()) return { response: NextResponse.json({ error: 'Not found' }, { status: 404 }) }

  const guard = await guardRequest(route, limitPerHour, 3600)
  if ('response' in guard) return guard

  const params = request.nextUrl.searchParams
  const coords = parseUsCoords(params.get('lat'), params.get('lng'))
  if (!coords) return { response: NextResponse.json({ error: 'Valid US lat and lng are required' }, { status: 400 }) }
  return coords
}
