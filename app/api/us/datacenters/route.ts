import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsDataCenters } from '@/lib/usDataCenterSource'

// Data centers within 10 miles, nearest first, with status and source (lib/usDataCenterSource.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-datacenters')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsDataCenters(coords.lat, coords.lng))
}
