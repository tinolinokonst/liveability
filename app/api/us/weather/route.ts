import { NextRequest, NextResponse } from 'next/server'
import { usRouteGuard } from '@/lib/usRoute'
import { getUsWeather } from '@/lib/usWeatherSource'

// NWS active alerts + HeatRisk (lib/usWeatherSource.ts)
export async function GET(request: NextRequest) {
  const coords = await usRouteGuard(request, 'us-weather')
  if ('response' in coords) return coords.response
  return NextResponse.json(await getUsWeather(coords.lat, coords.lng))
}
