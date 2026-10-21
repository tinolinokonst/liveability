import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsWalkability } from '@/lib/usDailyLifeSources'

// EPA National Walkability Index for the block group (lib/usDailyLifeSources.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-walkability')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsWalkability(coords.lat, coords.lng))
}
