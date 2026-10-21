import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsTransit } from '@/lib/usDailyLifeSources'

// OpenStreetMap stops + Mobility Database GTFS feeds (lib/usDailyLifeSources.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-transit')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsTransit(coords.lat, coords.lng))
}
