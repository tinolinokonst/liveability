import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsSafety } from '@/lib/usCommunitySources'

// FBI Crime Data Explorer rates for the city's (or county's) police agency (lib/usCommunitySources.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-safety')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsSafety(coords.lat, coords.lng))
}
