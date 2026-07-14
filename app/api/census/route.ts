import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'

const TIMEOUT_MS = 10000
const UNAVAILABLE = { medianHouseholdIncome: null, totalPopulation: null, available: false, message: 'Demographic data unavailable for this location' }

// Census values use large negative sentinels (e.g. -666666666) to mean "not available".
function cleanValue(raw: string | number | undefined): number | null {
  const num = Number(raw)
  if (!Number.isFinite(num) || num < 0) return null
  return num
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal, next: { revalidate: 86400 } })
  } finally {
    clearTimeout(timeout)
  }
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
    const geoUrl = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${coords.lng}&y=${coords.lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=10&format=json`
    const geoRes = await fetchWithTimeout(geoUrl)
    if (!geoRes.ok) {
      console.log(`Census geocoder fetch failed: status ${geoRes.status}`)
      return NextResponse.json(UNAVAILABLE)
    }

    const geoData = await geoRes.json()
    const tracts = geoData?.result?.geographies?.['Census Tracts']
    const tract = tracts?.[0]

    if (!tract) {
      console.log('Census geocoder returned no tract for this location')
      return NextResponse.json(UNAVAILABLE)
    }

    const state = tract.STATE
    const county = tract.COUNTY
    const tractCode = tract.TRACT

    if (!state || !county || !tractCode) {
      return NextResponse.json(UNAVAILABLE)
    }

    const apiKey = process.env.CENSUS_API_KEY
    const acsUrl = `https://api.census.gov/data/2022/acs/acs5?get=B19013_001E,B01003_001E&for=tract:${tractCode}&in=state:${state}+county:${county}${apiKey ? `&key=${apiKey}` : ''}`

    const acsRes = await fetchWithTimeout(acsUrl)
    if (!acsRes.ok) {
      console.log(`Census ACS fetch failed: status ${acsRes.status}`)
      return NextResponse.json(UNAVAILABLE)
    }

    const acsData = await acsRes.json()
    const row = acsData?.[1]

    if (!Array.isArray(row)) {
      console.log('Census ACS returned unexpected payload:', acsData)
      return NextResponse.json(UNAVAILABLE)
    }

    const [income, population] = row

    return NextResponse.json({
      medianHouseholdIncome: cleanValue(income),
      totalPopulation: cleanValue(population),
      tract: `${state}${county}${tractCode}`,
      available: true,
    })
  } catch (err) {
    console.log('Census demographics fetch error:', err)
    return NextResponse.json(UNAVAILABLE)
  }
}
