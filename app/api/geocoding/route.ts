import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { resolveAddress, UpstreamError } from '@/lib/geocodeServer'
import { cleanQueryText, MAX_ADDRESS_LENGTH } from '@/lib/validate'

// Address → coordinates (+ Census FIPS for US addresses). The logic, and why
// Switzerland is tried first, is in lib/geocodeServer.ts.
export async function GET(request: NextRequest) {
  const guard = await guardRequest('geocoding', 60, 3600)
  if ('response' in guard) return guard.response

  const address = cleanQueryText(request.nextUrl.searchParams.get('address'), MAX_ADDRESS_LENGTH)
  if (!address.ok) {
    return NextResponse.json({ error: address.error }, { status: 400 })
  }

  const key = process.env.GOOGLE_MAPS_SERVER_KEY
  if (!key) {
    // Don't name the missing variable in the client-facing message
    console.error('[geocoding] GOOGLE_MAPS_SERVER_KEY is not configured')
    return NextResponse.json({ error: 'Geocoding is temporarily unavailable' }, { status: 503 })
  }

  try {
    return NextResponse.json(await resolveAddress(address.value, key))
  } catch (err) {
    if (!(err instanceof UpstreamError)) console.error('[geocoding] fetch error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Geocoding is temporarily unavailable' }, { status: 503 })
  }
}
