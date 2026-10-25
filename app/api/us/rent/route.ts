import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsRent } from '@/lib/usCommunitySources'

// HUD Fair Market Rents: Small Area (ZIP) where published, else metro/county (lib/usCommunitySources.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-rent')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsRent(coords.lat, coords.lng))
}
