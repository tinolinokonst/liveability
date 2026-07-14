import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'

// Typical US range for max annual rooftop sunshine hours, used to scale to a 0-100 score.
const MIN_HOURS = 1000
const MAX_HOURS = 2200

const UNAVAILABLE = { score: null, hoursPerYear: null, available: false, message: 'Solar data not available for this building' }

export async function GET(request: NextRequest) {
  const guard = await guardRequest('sunlight', 60, 3600)
  if ('response' in guard) return guard.response

  const searchParams = request.nextUrl.searchParams
  const coords = parseCoords(searchParams.get('lat'), searchParams.get('lng'))

  if (!coords) {
    return NextResponse.json({ error: 'Valid Switzerland lat and lng are required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY
  if (!apiKey) {
    return NextResponse.json(UNAVAILABLE)
  }

  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${coords.lat}&location.longitude=${coords.lng}&key=${apiKey}`

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })

    if (!res.ok) {
      console.log(`Solar API fetch failed: status ${res.status}`)
      return NextResponse.json(UNAVAILABLE)
    }

    const data = await res.json()
    const hours = data?.solarPotential?.maxSunshineHoursPerYear

    if (typeof hours !== 'number') {
      return NextResponse.json(UNAVAILABLE)
    }

    const score = Math.round(Math.max(0, Math.min(100, ((hours - MIN_HOURS) / (MAX_HOURS - MIN_HOURS)) * 100)))

    return NextResponse.json({ score, hoursPerYear: Math.round(hours), available: true })
  } catch (err) {
    console.log('Solar API fetch error:', err)
    return NextResponse.json(UNAVAILABLE)
  }
}
