import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'

export async function GET(request: NextRequest) {
  const guard = await guardRequest('airquality', 60, 3600)
  if ('response' in guard) return guard.response

  const searchParams = request.nextUrl.searchParams
  const coords = parseCoords(searchParams.get('lat'), searchParams.get('lng'))

  if (!coords) {
    return NextResponse.json({ error: 'Valid Switzerland lat and lng are required' }, { status: 400 })
  }

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lng}&current=us_aqi`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) {
    return NextResponse.json({ error: 'AQI fetch failed' }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
