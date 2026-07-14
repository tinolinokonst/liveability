import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'
import { findCommune } from '@/lib/geoAdmin'

// Community snapshot for Swiss addresses: resolves the commune (Gemeinde)
// containing the coordinate from swissBOUNDARIES3D.
// Data source: Federal Office of Topography swisstopo (attribution required).
//
// TODO: enrich with commune-level statistics (population, median age, income)
// from the FSO STAT-TAB API (px-x-0102010000_101 has population per commune by
// BFS number); shipped as name + BFS number + canton first.

const UNAVAILABLE = {
  medianHouseholdIncome: null,
  totalPopulation: null,
  medianAge: null,
  available: false,
  message: 'Commune data unavailable for this location',
}

export async function GET(request: NextRequest) {
  const guard = await guardRequest('census', 60, 3600)
  if ('response' in guard) return guard.response

  const searchParams = request.nextUrl.searchParams
  const coords = parseCoords(searchParams.get('lat'), searchParams.get('lng'))

  if (!coords) {
    return NextResponse.json({ error: 'Valid Switzerland lat and lng are required' }, { status: 400 })
  }

  try {
    const communeInfo = await findCommune(coords.lat, coords.lng)
    if (!communeInfo) {
      console.log('[census] no commune found for coordinate')
      return NextResponse.json(UNAVAILABLE)
    }

    return NextResponse.json({
      medianHouseholdIncome: null,
      totalPopulation: null,
      medianAge: null,
      commune: communeInfo.commune,
      bfsNumber: communeInfo.bfsNumber,
      canton: communeInfo.canton,
      available: true,
      source: 'Federal Office of Topography swisstopo (swissBOUNDARIES3D)',
    })
  } catch (err) {
    console.log('[census] commune lookup error:', err)
    return NextResponse.json(UNAVAILABLE)
  }
}
