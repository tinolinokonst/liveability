import { NextRequest, NextResponse } from 'next/server'

// Typical US range for max annual rooftop sunshine hours, used to scale to a 0-100 score.
const MIN_HOURS = 1000
const MAX_HOURS = 2200

const UNAVAILABLE = { score: null, hoursPerYear: null, available: false, message: 'Solar data not available for this building' }

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json(UNAVAILABLE)
  }

  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&key=${apiKey}`

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
