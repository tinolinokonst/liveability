import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsHealth } from '@/lib/usDailyLifeSources'

// CDC PLACES tract estimates + CDC/ATSDR Social Vulnerability Index (lib/usDailyLifeSources.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-health')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsHealth(coords.lat, coords.lng))
}
