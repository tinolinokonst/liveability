import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsBroadband } from '@/lib/usDailyLifeSources'

// FCC National Broadband Map, county figures (lib/usDailyLifeSources.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-broadband')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsBroadband(coords.lat, coords.lng))
}
