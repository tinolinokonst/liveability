import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsSunlight } from '@/lib/usSolarSource'

// NLR solar resource (lib/usSolarSource.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-sunlight')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsSunlight(coords.lat, coords.lng))
}
