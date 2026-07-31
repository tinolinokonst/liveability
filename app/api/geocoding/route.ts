import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { cleanQueryText, MAX_ADDRESS_LENGTH } from '@/lib/validate'

export async function GET(request: NextRequest) {
  const guard = await guardRequest('geocoding', 60, 3600)
  if ('response' in guard) return guard.response

  const searchParams = request.nextUrl.searchParams
  const address = cleanQueryText(searchParams.get('address'), MAX_ADDRESS_LENGTH)

  if (!address.ok) {
    return NextResponse.json({ error: address.error }, { status: 400 })
  }

  const key = process.env.GOOGLE_MAPS_SERVER_KEY
  if (!key) {
    // Don't name the missing variable in the client-facing message
    console.error('[geocoding] GOOGLE_MAPS_SERVER_KEY is not configured')
    return NextResponse.json({ error: 'Geocoding is temporarily unavailable' }, { status: 503 })
  }

  // Restrict geocoding results to Switzerland
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address.value)}&region=ch&components=country:CH&key=${key}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`[geocoding] upstream HTTP ${res.status}`)
      return NextResponse.json({ error: 'Geocoding is temporarily unavailable' }, { status: 503 })
    }

    const data = await res.json()

    // Only forward the fields the client needs. Google's raw payload can carry
    // an `error_message` that names the API key / project, so never echo it.
    if (data.status !== 'OK' || !Array.isArray(data.results)) {
      if (data.error_message) console.error(`[geocoding] upstream: ${data.status}: ${data.error_message}`)
      return NextResponse.json({ status: data.status === 'ZERO_RESULTS' ? 'ZERO_RESULTS' : 'ERROR', results: [] })
    }

    const results = data.results.slice(0, 5).map((r: {
      formatted_address?: string
      geometry?: { location?: { lat?: number; lng?: number } }
    }) => ({
      formatted_address: r.formatted_address ?? null,
      geometry: { location: { lat: r.geometry?.location?.lat ?? null, lng: r.geometry?.location?.lng ?? null } },
    }))

    return NextResponse.json({ status: 'OK', results })
  } catch (err) {
    console.error('[geocoding] fetch error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Geocoding is temporarily unavailable' }, { status: 503 })
  }
}
