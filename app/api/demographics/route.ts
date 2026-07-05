import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { parseCoords } from '@/lib/coords'

const TIMEOUT_MS = 10000
const UNAVAILABLE = { medianHouseholdIncome: null, totalPopulation: null, medianAge: null, available: false, message: 'Demographic data unavailable for this location' }

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
  const guard = await guardRequest('demographics', 60, 3600)
  if ('response' in guard) return guard.response

  const { searchParams } = request.nextUrl
  const coords = parseCoords(searchParams.get('lat'), searchParams.get('lng'))

  if (!coords) {
    return NextResponse.json({ error: 'Valid Columbus-area lat and lng are required' }, { status: 400 })
  }

  try {
    const geoUrl = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${coords.lng}&y=${coords.lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=10&format=json`
    const geoRes = await fetchWithTimeout(geoUrl)
    if (!geoRes.ok) {
      console.log(`Census geocoder failed: ${geoRes.status}`)
      return NextResponse.json(UNAVAILABLE)
    }

    const geoData = await geoRes.json()
    const tract = geoData?.result?.geographies?.['Census Tracts']?.[0]
    if (!tract) return NextResponse.json(UNAVAILABLE)

    const { STATE: state, COUNTY: county, TRACT: tractCode } = tract
    if (!state || !county || !tractCode) return NextResponse.json(UNAVAILABLE)

    const apiKey = process.env.NEXT_PUBLIC_CENSUS_API_KEY
    const vars = 'B19013_001E,B01003_001E,B01002_001E'
    const acsUrl = `https://api.census.gov/data/2022/acs/acs5?get=${vars}&for=tract:${tractCode}&in=state:${state}+county:${county}${apiKey ? `&key=${apiKey}` : ''}`

    const acsRes = await fetchWithTimeout(acsUrl)
    if (!acsRes.ok) {
      console.log(`Census ACS failed: ${acsRes.status}`)
      return NextResponse.json(UNAVAILABLE)
    }

    const acsData = await acsRes.json()
    const row = acsData?.[1]
    if (!Array.isArray(row)) {
      console.log('Census ACS unexpected payload:', acsData)
      return NextResponse.json(UNAVAILABLE)
    }

    // Row order matches the get= param: income, population, medianAge, tract, county, state
    const [income, population, medianAge] = row

    return NextResponse.json({
      medianHouseholdIncome: cleanValue(income),
      totalPopulation: cleanValue(population),
      medianAge: cleanValue(medianAge),
      tract: `${state}${county}${tractCode}`,
      available: true,
    })
  } catch (err) {
    console.log('Census API error:', err)
    return NextResponse.json(UNAVAILABLE)
  }
}
