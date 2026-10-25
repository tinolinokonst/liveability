import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsCommunity } from '@/lib/usCommunitySources'

// Census ACS tract figures + Opportunity Atlas upward mobility (lib/usCommunitySources.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-community')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsCommunity(coords.lat, coords.lng))
}
