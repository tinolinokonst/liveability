import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsRisks } from '@/lib/usRiskSources'

// Flood zone, National Risk Index, wildfire, EPA sites — each part degrades on its own (lib/usRiskSources.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-risks')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsRisks(coords.lat, coords.lng))
}
