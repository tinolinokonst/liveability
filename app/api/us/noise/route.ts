import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsNoise } from '@/lib/usNoiseSource'

// BTS National Transportation Noise Map (lib/usNoiseSource.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-noise')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsNoise(coords.lat, coords.lng))
}
