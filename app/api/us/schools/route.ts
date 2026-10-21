import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsSchools } from '@/lib/usDailyLifeSources'

// NCES EDGE public and private schools (lib/usDailyLifeSources.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-schools')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsSchools(coords.lat, coords.lng))
}
