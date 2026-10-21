import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsFoodAccess } from '@/lib/usDailyLifeSources'

// OpenStreetMap grocery stores + USDA Food Access Research Atlas (lib/usDailyLifeSources.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-food')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsFoodAccess(coords.lat, coords.lng))
}
