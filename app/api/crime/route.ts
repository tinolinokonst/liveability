import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'
import { findCommune } from '@/lib/geoAdmin'
import { CANTON_CRIME_2024, CRIME_DATA_YEAR, safetyScoreForRate } from '@/lib/swissCrime'

// Safety indicator for Swiss addresses.
//
// Switzerland does not publish point-level crime incident data, so this endpoint
// returns a canton-level indicator built from the FSO Police Crime Statistics
// (PKS 2024, offences under the Swiss Criminal Code per 1,000 residents — see
// lib/swissCrime.ts for the exact cubes). The canton is resolved from the
// coordinate via swisstopo's swissBOUNDARIES3D commune layer.
//
// The response never fakes address-level precision: incidentCount stays 0, no
// incident coordinates are returned, and the note labels the data canton-level.

const FALLBACK = { incidentCount: 0, topIncidentTypes: [], safetyScore: 60, note: 'Safety data unavailable' }

export async function GET(request: NextRequest) {
  const guard = await guardRequest('crime', 60, 3600)
  if ('response' in guard) return guard.response

  const searchParams = request.nextUrl.searchParams
  const coords = parseCoords(searchParams.get('lat'), searchParams.get('lng'))

  if (!coords) {
    return NextResponse.json({ error: 'Valid Switzerland lat and lng are required' }, { status: 400 })
  }

  try {
    const communeInfo = await findCommune(coords.lat, coords.lng)
    const canton = communeInfo ? CANTON_CRIME_2024[communeInfo.canton] : undefined

    if (!communeInfo || !canton) {
      console.log('[crime] could not resolve canton for coordinate')
      return NextResponse.json(FALLBACK)
    }

    const safetyScore = safetyScoreForRate(canton.ratePer1000)

    return NextResponse.json({
      incidentCount: 0,
      topIncidentTypes: [],
      safetyScore,
      note: `Canton-level (${communeInfo.canton}), Source: Swiss Federal Statistical Office`,
      stateContext: {
        state: `Canton of ${canton.name} (${communeInfo.canton})`,
        rate: canton.ratePer1000,
        year: CRIME_DATA_YEAR,
        available: true,
      },
    })
  } catch (err) {
    console.log('[crime] canton lookup error:', err)
    return NextResponse.json(FALLBACK)
  }
}
