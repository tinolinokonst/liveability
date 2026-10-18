import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsAirQuality } from '@/lib/usAirSources'

// AirNow current reading + EPA AQS annual context (lib/usAirSources.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-airquality')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsAirQuality(coords.lat, coords.lng))
}
